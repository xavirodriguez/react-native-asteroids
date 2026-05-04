import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";
import { InputFrame, EntitySnapshot, ReplayFrame } from "./NetTypes";
import { INITIAL_GAME_STATE, GameStateComponent } from "../../src/games/asteroids/types/AsteroidTypes";
import { RandomService } from "../../src/engine/utils/RandomService";
import { World } from "../../src/engine/core/World";
import { DeterministicSimulation } from "../../src/simulation/DeterministicSimulation";
import { TransformComponent, VelocityComponent, HealthComponent, RenderComponent, Component } from "../../src/engine/core/CoreComponents";
import { createShip, createAsteroid } from "../../src/games/asteroids/EntityFactory";
import { InputComponent, ShipComponent, BulletComponent } from "../../src/games/asteroids/types/AsteroidTypes";
import { InterestManagerSystem } from "../../src/engine/network/InterestManagerSystem";
import { SpatialPartitioningSystem } from "../../src/engine/systems/SpatialPartitioningSystem";
import { SpatialGrid } from "../../src/engine/physics/utils/SpatialGrid";
import { NetworkMetricsCollector } from "./metrics/NetworkMetrics";
import { ReplicationStateTracker } from "../../src/engine/network/ReplicationStateTracker";
import { ClientAckTracker } from "../../src/engine/network/ClientAckTracker";
import { NetworkDeltaSystem } from "../../src/engine/network/NetworkDeltaSystem";
import { NetworkBudgetManager } from "../../src/engine/network/NetworkBudgetManager";
import { BinaryCompression } from "../../src/engine/network/BinaryCompression";

/**
 * Authoritative Game Room for Asteroids.
 *
 * Orchestrates the authoritative server-side simulation, client input synchronization,
 * and optimized state replication using various strategies (Interest, Delta, Binary).
 *
 * @responsibility Manage Colyseus room lifecycle and client connections.
 * @responsibility Execute authoritative {@link DeterministicSimulation} at 60Hz.
 * @responsibility Implement multi-mode replication (Interest Management, Delta Compression).
 * @responsibility Maintain historical snapshots for lag compensation and re-simulation.
 *
 * @remarks
 * ### Data Flow (The Server Tick Pipeline)
 * 1. **Input Recovery**: Retrieves buffered user actions matching the current `serverTick`.
 * 2. **Authoritative Simulation**: Advances the ECS World using the shared simulation logic.
 * 3. **World Sync**: Copies authoritative state from ECS components to Colyseus Schema objects.
 * 4. **Filtering & Encoding**:
 *    - Applies **Interest Management** (Spatial Hash) to determine visibility per client.
 *    - Generates **Delta Packets** by comparing `world.stateVersion` against client ACKs.
 *    - (Optional) Compresses payloads using **MessagePack** (Binary Mode).
 * 5. **Dispatch**: Transmits optimized updates to connected clients.
 *
 * @conceptualRisk [BANDWIDTH][HIGH] 'legacy' mode sends full JSON snapshots (avoid for >20 entities).
 * @conceptualRisk [TICK_DRIFT] Discrepancies between fixed simulation and variable patch rates
 * can cause visual jitter without client-side interpolation.
 */
export class AsteroidsRoom extends Room<AsteroidsState> {
  maxClients = 4;
  /** Paso de tiempo fijo para el motor ECS (60Hz). */
  private fixedTimeStep = 16.66;
  private inputBuffers = new Map<string, InputFrame[]>();
  private stateHistory = new Map<number, import("../../src/engine/types/EngineTypes").WorldSnapshot>();
  private clientAcks = new Map<string, number>(); // sessionId -> lastAckedStateVersion
  private replayFrames: ReplayFrame[] = [];
  private world: World;
  private playerEntities = new Map<string, number>();
  private newClients = new Set<string>();
  private nextPlayerNumber = 1;
  private networkMetrics = new NetworkMetricsCollector();
  private replicationTracker = new ReplicationStateTracker();
  private ackTracker = new ClientAckTracker();
  private budgetManager = new NetworkBudgetManager();
  private deltaSystem = new NetworkDeltaSystem(this.replicationTracker);
  private REPLICATION_MODE: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' = 'legacy';

  private spawnAsteroids(count: number) {
    const gameplayRandom = RandomService.getInstance("gameplay");
    for (let i = 0; i < count; i++) {
        const x = gameplayRandom.nextRange(0, 800);
        const y = gameplayRandom.nextRange(0, 600);
        createAsteroid({ world: this.world, x, y, size: "large" });
    }
  }

  onCreate(options: { seed?: number, replicationMode?: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' }) {
    if (options.replicationMode) {
        this.REPLICATION_MODE = options.replicationMode;
    }
    this.newClients.clear();
    this.state = new AsteroidsState();
    this.state.seed = options.seed || Math.floor(Math.random() * 0xFFFFFFFF);
    // Sync the global gameplay random service for the server
    RandomService.getInstance("gameplay").setSeed(this.state.seed);

    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    this.setPatchRate(50); // 20 FPS network patches
    this.setSimulationInterval((dt) => this.update(dt), this.fixedTimeStep);

    this.onMessage("input", (client, frame: InputFrame) => {
      const buffer = this.inputBuffers.get(client.sessionId) || [];
      buffer.push(frame);
      this.inputBuffers.set(client.sessionId, buffer);
    });

    this.onMessage("sync_tick", (client, data) => {
      if (data?.lastAckedVersion !== undefined) {
        this.clientAcks.set(client.sessionId, data.lastAckedVersion);
      }
      if (data?.sequence !== undefined) {
        this.ackTracker.recordAck(client.sessionId, data.sequence, this.state.serverTick);
      }
      client.send("sync_tick", {
        protocolVersion: this.state.protocolVersion,
        serverTick: this.state.serverTick,
        timestamp: data?.timestamp ?? 0
      });
    });

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;
      this.spawnAsteroids(6);
    });

    this.onMessage("metrics", (client) => {
      client.send("metrics", {
        protocolVersion: this.state.protocolVersion,
        ...this.networkMetrics.getMetrics()
      });
    });

    // Initialized ECS world
    this.world = new World();
    this.world.setResource("SpatialGrid", new SpatialGrid());
    this.world.addComponent(this.world.createEntity(), {
        ...INITIAL_GAME_STATE,
        serverTick: 0,
        level: 1,
        lives: 3
    } as GameStateComponent);
    this.world.addSystem(new SpatialPartitioningSystem());
    this.world.addSystem(new InterestManagerSystem());
  }

  onJoin(client: Client, options: { name?: string }) {
    const gameplayRandom = RandomService.getInstance("gameplay");
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${this.nextPlayerNumber++}`;
    player.x = gameplayRandom.nextRange(100, 700);
    player.y = gameplayRandom.nextRange(100, 500);
    player.angle = 0;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    this.state.players.set(client.sessionId, player);

    // Create ECS entity for player
    const entity = createShip({ world: this.world, x: player.x, y: player.y });
    this.playerEntities.set(client.sessionId, entity);
    this.newClients.add(client.sessionId);

    // Add necessary multiplayer components
    this.world.addComponent(entity, {
        type: "Ship",
        sessionId: client.sessionId,
        hyperspaceTimer: 0,
        hyperspaceCooldownRemaining: 0
    } as ShipComponent);
  }

  async onLeave(client: Client, code: number) {
    try {
      if (code === CloseCode.CONSENTED) throw new Error("consented leave");
      await this.allowReconnection(client, 10);
    } catch (_err) {
      this.state.players.delete(client.sessionId);
      this.inputBuffers.delete(client.sessionId);
      this.clientAcks.delete(client.sessionId);
      this.newClients.delete(client.sessionId);
    }
  }

  /**
   * Bucle principal de actualización del servidor (Fixed Step @ 60Hz).
   *
   * @remarks
   * Sigue un pipeline estricto para mantener la autoridad del estado y la eficiencia de red:
   *
   * 1. **Tick Sync**: Incrementa `serverTick`, la referencia temporal absoluta.
   * 2. **Input Recovery**: Extrae inputs del buffer de cada cliente correspondientes al tick actual.
   * 3. **Authoritative Simulation**: Ejecuta la lógica compartida (`DeterministicSimulation`).
   * 4. **Post-Simulation**: Ejecuta sistemas exclusivos del servidor (ej. `InterestManagerSystem`).
   * 5. **Schema Sync**: Sincroniza el mundo ECS con los objetos Schema de Colyseus para clientes 'legacy'.
   * 6. **Advanced Replication**:
   *    - **Legacy**: Envía JSON completo del estado.
   *    - **Interest**: Filtra entidades por cercanía espacial.
   *    - **Delta/Binary**: Calcula qué componentes han cambiado basándose en `stateVersion` y ACKs.
   * 7. **Replay & Cleanup**: Registra frames para repeticiones y limpia buffers de entrada antiguos.
   */
  update(_dt: number) {
    if (!this.state.gameStarted) return;
    this.state.serverTick++;
    this.state.lastProcessedTick = this.state.serverTick;

    // 1. Collect and Update Inputs in ECS from buffers
    const currentInputs: Record<string, InputFrame[]> = {};
    this.state.players.forEach((_player: Player, sessionId: string) => {
      const entity = this.playerEntities.get(sessionId);
      if (entity === undefined) return;

      const input = this.world.getComponent<InputComponent>(entity, "Input");
      const buffer = this.inputBuffers.get(sessionId);

      if (buffer && input) {
        const frame = buffer.find(f => f.tick === this.state.serverTick);
        if (frame) {
            input.rotateLeft = frame.actions.includes("rotateLeft") || (frame.axes?.rotate_left ?? 0) > 0;
            input.rotateRight = frame.actions.includes("rotateRight") || (frame.axes?.rotate_right ?? 0) > 0;
            input.thrust = frame.actions.includes("thrust") || (frame.axes?.thrust ?? 0) > 0;
            input.shoot = frame.actions.includes("shoot");
            input.hyperspace = frame.actions.includes("hyperspace");
            currentInputs[sessionId] = [frame];
        }
      }
    });

    // 2. Run Shared Deterministic Simulation
    // In a full implementation, we'd loop through inputs and backtrack for shots.
    // For this roadmap iteration, we simulate one tick.
    DeterministicSimulation.update(this.world, this.fixedTimeStep, { isResimulating: false });

    // 2.1 Run server-only systems (Spatial Partitioning, Interest Management)
    // Manually advance world.tick to fix Hallazgo 6
    this.world.advanceTick();
    this.world.systemsList.forEach(system => system.update(this.world, 0));
    this.world.flush();

    // 3. Sync ECS World back to Colyseus Schema
    this.syncWorldToSchema();

    // 4. Update per-client delta snapshots (Interest-based)
    let totalBytesSentThisTick = 0;
    let totalSerializationMs = 0;
    let totalEntitiesFiltered = 0;
    const totalEntitiesInWorld = this.world.entities.length;

    if (this.REPLICATION_MODE === 'legacy') {
        const fullSerializationStart = Date.now();
        const snapshot = this.world.snapshot();
        const serialized = JSON.stringify(snapshot);
        totalSerializationMs += (Date.now() - fullSerializationStart);
        this.state.fullWorldState = serialized;
        totalBytesSentThisTick = serialized.length;
    } else {
        const detailedInterestMap = this.world.getResource<Map<string, import("../../src/engine/network/types/ReplicationTypes").InterestedEntity[]>>("DetailedInterestMap");
        this.clients.forEach(client => {
            const isNew = this.newClients.has(client.sessionId);
            const interest = detailedInterestMap?.get(client.sessionId) || [];
            let interestIds: Set<number>;

            if (this.REPLICATION_MODE === 'interest' || isNew) {
                interestIds = new Set(interest.map(e => parseInt(e.entityId)));
            } else {
                // Iteration 4: Budgeting
                const selfEntityId = this.playerEntities.get(client.sessionId)?.toString();
                const prioritized = this.budgetManager.prioritize(client.sessionId, interest, undefined, selfEntityId);
                interestIds = new Set(prioritized.map(e => parseInt(e.entityId)));
            }

            totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);

            const serializationStart = Date.now();

            if (this.REPLICATION_MODE === 'interest' || isNew) {
                const snapshot = this.world.snapshot();
                // Filter snapshot entities (unless it's a legacy or we want full for new clients)
                if (!isNew) {
                    snapshot.entities = snapshot.entities.filter(id => interestIds.has(id));
                    for (const type in snapshot.componentData) {
                        for (const id in snapshot.componentData[type]) {
                            if (!interestIds.has(parseInt(id))) {
                                delete snapshot.componentData[type][id];
                            }
                        }
                    }
                }
                const serialized = JSON.stringify(snapshot);
                totalSerializationMs += (Date.now() - serializationStart);
                totalBytesSentThisTick += serialized.length;
                client.send("world_delta", {
                    protocolVersion: this.state.protocolVersion,
                    tick: this.state.serverTick,
                    delta: serialized
                });
                if (isNew) this.newClients.delete(client.sessionId);
            } else {
                // Iteration 3: Delta Compression
                const sequence = this.ackTracker.nextSequence(client.sessionId);
                const baselineAck = this.ackTracker.getLastAckedSequence(client.sessionId);
                const idleTime = this.ackTracker.getIdleTime(client.sessionId);
                const forceFull = idleTime > 3000 || baselineAck === 0;

                const deltaPacket = this.deltaSystem.generateDelta(
                    this.world,
                    client.sessionId,
                    sequence,
                    baselineAck,
                    interestIds,
                    forceFull
                );

                if (this.REPLICATION_MODE === 'binary') {
                    // Iteration 5: Binary Compression
                    const binaryPacket = BinaryCompression.pack(deltaPacket);
                    totalSerializationMs += (Date.now() - serializationStart);
                    totalBytesSentThisTick += binaryPacket.length;
                    client.send("world_delta_bin", binaryPacket);
                } else {
                    const serialized = JSON.stringify(deltaPacket);
                    totalSerializationMs += (Date.now() - serializationStart);
                    totalBytesSentThisTick += serialized.length;
                    client.send("world_delta", {
                        protocolVersion: this.state.protocolVersion,
                        tick: this.state.serverTick,
                        delta: serialized
                    });
                }
            }
        });

        // Optimization: Only update fullWorldState occasionally for late joiners
        if (this.state.serverTick % 60 === 0) {
            const snapshot = this.world.snapshot();
            this.state.fullWorldState = JSON.stringify(snapshot);
        }
    }

    // Record metrics every tick
    // We count specific entities (players + asteroids + bullets) as per Iteration 1 requirements
    const trackedEntitiesCount = this.state.players.size + this.state.asteroids.size + this.state.bullets.size;

    this.networkMetrics.recordTick(
        totalBytesSentThisTick,
        trackedEntitiesCount,
        totalSerializationMs,
        this.clients.length,
        this.clients.length > 0 ? totalEntitiesFiltered / this.clients.length : 0
    );


    // 5. Record for Replay
    this.replayFrames.push({
        tick: this.state.serverTick,
        inputs: currentInputs,
        events: []
    });

    // Limit replay to 5 minutes (18000 ticks)
    if (this.replayFrames.length > 18000) {
        this.replayFrames.shift();
    }

    // 6. Cleanup input buffers (processed ticks)
    this.state.players.forEach((_player: Player, sessionId: string) => {
      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > this.state.serverTick));
      }
    });

    // 7. Store history for lag compensation (Backtracking)
    this.stateHistory.set(this.state.serverTick, this.world.snapshot());
    while (this.stateHistory.size > 120) { // Keep 2 seconds of history @ 60Hz
        const oldestTick = Math.min(...this.stateHistory.keys());
        this.stateHistory.delete(oldestTick);
    }

    // 8. Check Game Over to broadcast replay
    if (this.state.gameOver && this.replayFrames.length > 0) {
        this.broadcast("replay", {
            protocolVersion: this.state.protocolVersion,
            version: 1,
            roomId: this.roomId,
            startTick: this.replayFrames[0].tick,
            endTick: this.state.serverTick,
            frames: this.replayFrames
        });
        this.replayFrames = []; // Clear after broadcast
    }
  }

  /**
   * Synchronizes the authoritative ECS World state into the Colyseus Schema.
   * This is necessary because the Schema is the source of truth for the clients
   * that use standard Colyseus state synchronization.
   */
  /**
   * Temporarily restores entities to a previous state for lag-compensated hit detection.
   * @param targetTick The tick to backtrack to.
   * @returns A function to restore the entities to their current state.
   */
  private backtrackEntities(targetTick: number): () => void {
    const historicalSnapshot = this.stateHistory.get(targetTick);
    if (!historicalSnapshot) return () => {};

    // Save current state of potential targets (Asteroids)
    const currentSnapshot = this.world.snapshot();

    // We only want to backtrack targets, not the shooter.
    // For simplicity, we restore the whole world but we'll need to be careful with shooters.
    // In a more complex implementation, we'd only mutate Transform components of targets.
    this.world.restore(historicalSnapshot);

    return () => {
      this.world.restore(currentSnapshot);
    };
  }

  private syncWorldToSchema() {
    // Sync Players
    this.playerEntities.forEach((entity, sessionId) => {
        const player = this.state.players.get(sessionId);
        if (!player) return;

        const pos = this.world.getComponent<TransformComponent>(entity, "Transform");
        const vel = this.world.getComponent<VelocityComponent>(entity, "Velocity");
        const render = this.world.getComponent<RenderComponent>(entity, "Render");
        const health = this.world.getComponent<HealthComponent>(entity, "Health");

        if (pos) {
            player.x = pos.x;
            player.y = pos.y;
            player.angle = pos.rotation;
        }
        if (render) {
            // Priority to render rotation if it's the one being mutated by physics
            if (render.rotation !== undefined) player.angle = render.rotation;
        }
        if (vel) {
            player.velocityX = vel.dx;
            player.velocityY = vel.dy;
        }
        if (health) {
            player.lives = health.current;
            player.alive = health.current > 0;
        }
    });

    // Sync Asteroids
    const asteroidEntities = this.world.query("Asteroid", "Transform");
    const currentAsteroidIds = new Set<string>();
    asteroidEntities.forEach(entity => {
        const id = entity.toString();
        currentAsteroidIds.add(id);
        const pos = this.world.getComponent<TransformComponent>(entity, "Transform")!;
        const asteroidComp = this.world.getComponent<Component & { size: string }>(entity, "Asteroid")!;

        let asteroid = this.state.asteroids.get(id);
        if (!asteroid) {
            asteroid = new Asteroid();
            asteroid.id = id;
            this.state.asteroids.set(id, asteroid);
        }
        asteroid.x = pos.x;
        asteroid.y = pos.y;
        asteroid.size = asteroidComp.size === "large" ? 3 : asteroidComp.size === "medium" ? 2 : 1;
    });
    // Cleanup removed asteroids
    this.state.asteroids.forEach((_: Asteroid, id: string) => {
        if (!currentAsteroidIds.has(id)) this.state.asteroids.delete(id);
    });

    // Sync Bullets
    const bulletEntities = this.world.query("Bullet", "Transform");
    const currentBulletIds = new Set<string>();
    bulletEntities.forEach(entity => {
        const id = entity.toString();
        currentBulletIds.add(id);
        const pos = this.world.getComponent<TransformComponent>(entity, "Transform")!;

        let bullet = this.state.bullets.get(id);
        if (!bullet) {
            bullet = new Bullet();
            this.state.bullets.set(id, bullet);
        }
        bullet.x = pos.x;
        bullet.y = pos.y;

        const bulletComp = this.world.getComponent<BulletComponent>(entity, "Bullet");
        if (bulletComp?.ownerId) {
            bullet.ownerId = bulletComp.ownerId;
        }
    });
    this.state.bullets.forEach((_: Bullet, id: string) => {
        if (!currentBulletIds.has(id)) this.state.bullets.delete(id);
    });

    const gameState = this.world.getSingleton<Component>("GameState");
    if (gameState && this.state.players.size > 0) {
        // Simple game over check
        let anyAlive = false;
        this.state.players.forEach((p: Player) => { if (p.alive) anyAlive = true; });
        if (!anyAlive && this.state.gameStarted) this.state.gameOver = true;
    }
  }
}

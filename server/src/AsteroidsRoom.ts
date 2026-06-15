import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";
import { InputFrame, ReplayFrame } from "./NetTypes";
import { GameStateComponent, ShipComponent, BulletComponent } from "../../src/games/asteroids/types/AsteroidTypes";
import { World, TransformComponent, VelocityComponent, HealthComponent, RenderComponent, InterestManagerSystem, ReplicationStateTracker, ClientAckTracker, NetworkDeltaSystem, NetworkBudgetManager, BinaryCompression, WorldSnapshot } from "@tiny-aster/core";
import { AsteroidsGame } from "../../src/games/asteroids/AsteroidsGame";
import { createShip, createAsteroid } from "../../src/games/asteroids/EntityFactory";
import { leaderboardStore } from "./DailyLeaderboardStore";
import { getDateKey } from "./utils/DateUtils";
import { NetworkMetricsCollector } from "./metrics/NetworkMetrics";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../../src/games/asteroids/types/AsteroidRegistry";

export class AsteroidsRoom extends (Room as any) {
  maxClients = 4;
  private fixedTimeStep = 16.66;
  private inputBuffers = new Map<string, InputFrame[]>();
  private stateHistory = new Map<number, WorldSnapshot>();
  private clientAcks = new Map<string, number>();
  private replayFrames: ReplayFrame[] = [];
  private gameSimulation!: AsteroidsGame;
  private world!: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  private playerEntities = new Map<string, number>();
  private newClients = new Set<string>();
  private nextPlayerNumber = 1;
  private networkMetrics = new NetworkMetricsCollector();
  private replicationTracker = new ReplicationStateTracker();
  private ackTracker = new ClientAckTracker();
  private budgetManager = new NetworkBudgetManager();
  private deltaSystem = new NetworkDeltaSystem(this.replicationTracker);
  private REPLICATION_MODE: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' = 'binary';

  private spawnAsteroids(count: number) {
    const gameplayRandom = this.world.gameplayRandom;
    for (let i = 0; i < count; i++) {
        const x = gameplayRandom.nextRange(0, 800);
        const y = gameplayRandom.nextRange(0, 600);
        createAsteroid({ world: this.world, x, y, size: "large" });
    }
  }

  async onCreate(options: { seed?: number, replicationMode?: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' }) {
    if (options.replicationMode) {
        this.REPLICATION_MODE = options.replicationMode;
    }
    this.newClients.clear();
    this.setState(new AsteroidsState());
    this.state.seed = options.seed || Math.floor(Math.random() * 0xFFFFFFFF);

    this.gameSimulation = new AsteroidsGame({
        headless: true,
        isMultiplayer: true,
        seed: this.state.seed
    });
    await this.gameSimulation.initialize();
    this.world = this.gameSimulation.getWorld();

    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    this.setPatchRate(50);
    this.setSimulationInterval((dt: any) => this.update(dt));

    this.onMessage("input", (client: any, frame: InputFrame) => {
      const buffer = this.inputBuffers.get(client.sessionId) || [];
      buffer.push(frame);
      this.inputBuffers.set(client.sessionId, buffer);
    });

    this.onMessage("sync_tick", (client: any, data: any) => {
      if (data?.lastAckedVersion !== undefined) {
        this.clientAcks.set(client.sessionId, data.lastAckedVersion);
      }
      if (data?.sequence !== undefined) {
        this.ackTracker.recordAck(client.sessionId, data.sequence, this.state.serverTick);
      }
      client.send("sync_tick", {
        protocolVersion: this.state.protocolVersion,
        serverTick: this.state.serverTick,
        timestamp: (data?.timestamp && data.timestamp > 0) ? data.timestamp : Date.now()
      });
    });

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;
      this.spawnAsteroids(6);

      this.world.getEventBus().on("game:over" as any, () => {
          this.state.gameOver = true;
          console.log(`[AsteroidsRoom] Game Over. Final Authoritative Score: ${this.state.score}`);
      });
    });

    this.onMessage("metrics", (client: any) => {
      client.send("metrics", {
        protocolVersion: this.state.protocolVersion,
        ...this.networkMetrics.getMetrics()
      });
    });

    this.world.addSystem(new InterestManagerSystem() as any);
  }

  onJoin(client: Client, options: { name?: string }) {
    const gameplayRandom = this.world.gameplayRandom;
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

    const entity = createShip({ world: this.world, x: player.x, y: player.y });
    this.playerEntities.set(client.sessionId, entity);
    this.newClients.add(client.sessionId);

    (this.world as any).addComponent(entity, "Ship", {
        type: "Ship",
        sessionId: client.sessionId,
    });
  }

  async onLeave(client: Client, _code: number) {
    const player = this.state.players.get(client.sessionId);
    if (player && player.score > 0) {
        const dateKey = getDateKey();
        console.log(`[AsteroidsRoom] Recording authoritative score for ${player.name}: ${player.score}`);
        leaderboardStore.addScore("asteroids", dateKey, player.sessionId, player.score, player.name, true);
    }

    try {
      if (_code === CloseCode.CONSENTED) throw new Error("consented leave");
      await this.allowReconnection(client, 10);
    } catch (_err) {
      this.state.players.delete(client.sessionId);
      this.inputBuffers.delete(client.sessionId);
      this.clientAcks.delete(client.sessionId);
      this.newClients.delete(client.sessionId);
    }
  }

  update(_dt: number) {
    if (!this.state.gameStarted) return;
    this.state.serverTick++;
    this.state.lastProcessedTick = this.state.serverTick;

    const currentInputs: Record<string, InputFrame[]> = {};
    this.state.players.forEach((_player: Player, sessionId: string) => {
      const entity = this.playerEntities.get(sessionId);
      if (entity === undefined) return;

      const buffer = this.inputBuffers.get(sessionId);

      if (buffer) {
        const frame = buffer.find(f => f.tick === this.state.serverTick);
        if (frame) {
            this.gameSimulation.applyInputToEntity(entity, frame);
            currentInputs[sessionId] = [frame];
        }
      }
    });

    this.gameSimulation.runSimulationStep(this.fixedTimeStep, false);

    this.syncWorldToSchema();

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
        const detailedInterestMap = this.world.getResource<Map<string, any[]>>("DetailedInterestMap");
        this.clients.forEach((client: any) => {
            const isNew = this.newClients.has(client.sessionId);
            const interest = detailedInterestMap?.get(client.sessionId) || [];
            let interestIds: Set<number>;

            if (this.REPLICATION_MODE === 'interest' || isNew) {
                interestIds = new Set(interest.map((e: any) => parseInt(e.entityId)));
            } else {
                const selfEntityId = this.playerEntities.get(client.sessionId)?.toString();
                const prioritized = this.budgetManager.prioritize(client.sessionId, interest, selfEntityId);
                interestIds = new Set(prioritized.map((e: any) => parseInt(e.entityId)));
            }

            totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);

            const serializationStart = Date.now();

            if (this.REPLICATION_MODE === 'interest' || isNew) {
                const snapshot = this.world.snapshot();
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

        if (this.state.serverTick % 60 === 0) {
            const snapshot = this.world.snapshot();
            this.state.fullWorldState = JSON.stringify(snapshot);
        }
    }

    const trackedEntitiesCount = this.state.players.size + this.state.asteroids.size + this.state.bullets.size;

    this.networkMetrics.recordTick(
        totalBytesSentThisTick,
        trackedEntitiesCount,
        totalSerializationMs,
        (this as any).clients.length,
        (this as any).clients.length > 0 ? totalEntitiesFiltered / (this as any).clients.length : 0
    );


    this.replayFrames.push({
        tick: this.state.serverTick,
        inputs: currentInputs,
        events: []
    });

    if (this.replayFrames.length > 18000) {
        this.replayFrames.shift();
    }

    this.state.players.forEach((_player: Player, sessionId: string) => {
      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > this.state.serverTick));
      }
    });

    this.stateHistory.set(this.state.serverTick, this.world.snapshot());

    const oldestTick = this.state.serverTick - 120;
    this.stateHistory.delete(oldestTick);

    if (this.state.gameOver && this.replayFrames.length > 0) {
        this.broadcast("replay", {
            protocolVersion: this.state.protocolVersion,
            version: 1,
            roomId: this.roomId,
            startTick: this.replayFrames[0].tick,
            endTick: this.state.serverTick,
            frames: this.replayFrames
        });
        this.replayFrames = [];
    }
  }

  onDispose() {
    console.log(`[AsteroidsRoom] Disposing room ${this.roomId}`);
    this.stateHistory.clear();
    this.inputBuffers.clear();
    this.clientAcks.clear();
    this.playerEntities.clear();
    this.newClients.clear();
    this.replayFrames = [];
    if (this.gameSimulation) {
        this.gameSimulation.destroy();
    }
  }

  private syncWorldToSchema() {
    this.playerEntities.forEach((entity, sessionId) => {
        const player = this.state.players.get(sessionId);
        if (!player) return;

        const pos = this.world.getComponent(entity, "Transform");
        const vel = this.world.getComponent(entity, "Velocity");
        const render = this.world.getComponent(entity, "Render");
        const health = this.world.getComponent(entity, "Health");

        if (pos) {
            player.x = pos.x;
            player.y = pos.y;
            player.angle = pos.rotation;
        }
        if (render) {
            if (render.rotation !== undefined) player.angle = render.rotation;
        }
        if (vel) {
            player.velocityX = vel.vx;
            player.velocityY = vel.vy;
        }
        if (health) {
            player.lives = health.current;
            player.alive = health.current > 0;
        }

        const ship = this.world.getComponent(entity, "Ship");
        if (ship) {
            // score logic if available
        }
    });

    const asteroidEntities = this.world.query("Asteroid", "Transform");
    const currentAsteroidIds = new Set<string>();
    asteroidEntities.forEach(entity => {
        const id = entity.toString();
        currentAsteroidIds.add(id);
        const pos = this.world.getComponent(entity, "Transform")!;
        const asteroidComp = this.world.getComponent(entity, "Asteroid")!;

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
    this.state.asteroids.forEach((_: Asteroid, id: string) => {
        if (!currentAsteroidIds.has(id)) this.state.asteroids.delete(id);
    });

    const bulletEntities = this.world.query("Bullet", "Transform");
    const currentBulletIds = new Set<string>();
    bulletEntities.forEach(entity => {
        const id = entity.toString();
        currentBulletIds.add(id);
        const pos = this.world.getComponent(entity, "Transform")!;

        let bullet = this.state.bullets.get(id);
        if (!bullet) {
            bullet = new Bullet();
            this.state.bullets.set(id, bullet);
        }
        bullet.x = pos.x;
        bullet.y = pos.y;

        const bulletComp = this.world.getComponent(entity, "Bullet");
        if (bulletComp?.ownerId) {
            bullet.ownerId = bulletComp.ownerId;
        }
    });
    this.state.bullets.forEach((_: Bullet, id: string) => {
        if (!currentBulletIds.has(id)) this.state.bullets.delete(id);
    });

    const gameState = this.world.getSingleton("GameState");
    if (gameState && this.state.players.size > 0) {
        this.state.score = gameState.score;

        let anyAlive = false;
        this.state.players.forEach((p: Player) => { if (p.alive) anyAlive = true; });
        if (!anyAlive && this.state.gameStarted) this.state.gameOver = true;
    }
  }
}

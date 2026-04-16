import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";
import { InputFrame, EntitySnapshot, ReplayFrame } from "./NetTypes";
import { RandomService } from "../../src/engine/utils/RandomService";
import { World } from "../../src/engine/core/World";
import { DeterministicSimulation } from "../../src/simulation/DeterministicSimulation";
import { TransformComponent, VelocityComponent, HealthComponent, RenderComponent, Component } from "../../src/engine/core/CoreComponents";
import { createShip, createAsteroid } from "../../src/games/asteroids/EntityFactory";
import { ShipComponent, InputComponent } from "../../src/games/asteroids/types/AsteroidTypes";

export class AsteroidsRoom extends Room<AsteroidsState> {
  declare state: AsteroidsState;
  maxClients = 4;
  private fixedTimeStep = 16.66; // 60 FPS
  private inputBuffers = new Map<string, InputFrame[]>();
  private stateHistory = new Map<number, Map<string, EntitySnapshot>>();
  private replayFrames: ReplayFrame[] = [];
  private world: World;
  private playerEntities = new Map<string, number>();

  private spawnAsteroids(count: number) {
    const gameplayRandom = RandomService.getInstance("gameplay");
    for (let i = 0; i < count; i++) {
        const x = gameplayRandom.nextRange(0, 800);
        const y = gameplayRandom.nextRange(0, 600);
        createAsteroid({ world: this.world, x, y, size: "large" });
    }
  }

  onCreate(options: { seed?: number }) {
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

    this.onMessage("sync_tick", (client) => {
      client.send("sync_tick", {
        serverTick: this.state.serverTick,
        timestamp: 0 // Date.now() removed for determinism, if needed use tick
      });
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.spawnAsteroids(6);
    });

    // Initialized ECS world
    this.world = new World();
    this.world.addComponent(this.world.createEntity(), { type: "GameState", score: 0 } as Component);
  }

  onJoin(client: Client, options: { name?: string }) {
    const gameplayRandom = RandomService.getInstance("gameplay");
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${this.clients.length}`;
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

    // Add necessary multiplayer components
    this.world.addComponent(entity, { type: "Ship", sessionId: client.sessionId, hyperspaceTimer: 0, hyperspaceCooldownRemaining: 0 } as ShipComponent);
  }

  async onLeave(client: Client, code: number) {
    try {
      if (code === CloseCode.CONSENTED) throw new Error("consented leave");
      await this.allowReconnection(client, 10);
    } catch (_err) {
      this.state.players.delete(client.sessionId);
      this.inputBuffers.delete(client.sessionId);
    }
  }

  update(_dt: number) {
    if (!this.state.gameStarted) return;
    this.state.serverTick++;
    this.state.lastProcessedTick = this.state.serverTick;

    // 1. Update Inputs in ECS from buffers
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
        }
        // Cleanup old frames
        this.inputBuffers.set(sessionId, buffer.filter(f => f.tick >= this.state.serverTick));
      }
    });

    // 2. Run Shared Deterministic Simulation
    DeterministicSimulation.update(this.world, this.fixedTimeStep, { isResimulating: false });

    // 3. Sync ECS World back to Colyseus Schema
    this.syncWorldToSchema();

    // 4. Update full world state for clients (for rollback)
    // Only send full snapshot every 3 ticks to reduce bandwidth,
    // but in a strict rollback system we might need it every tick if we don't have delta-sync.
    // For now, we update it every tick as required for the current implementation.
    this.state.fullWorldState = JSON.stringify(this.world.snapshot());

    // 5. Record for Replay
    const currentInputs: Record<string, InputFrame[]> = {};
    this.state.players.forEach((_player: Player, sessionId: string) => {
        const buffer = this.inputBuffers.get(sessionId);
        if (buffer) {
            currentInputs[sessionId] = buffer.filter(f => f.tick === this.state.serverTick);
        }
    });

    this.replayFrames.push({
        tick: this.state.serverTick,
        inputs: currentInputs,
        events: []
    });

    // Limit replay to 5 minutes (18000 ticks)
    if (this.replayFrames.length > 18000) {
        this.replayFrames.shift();
    }

    // 6. Store history for lag compensation
    const snapshot = new Map<string, EntitySnapshot>();
    this.state.players.forEach((p: Player, id: string) => {
        snapshot.set(id, { tick: this.state.serverTick, x: p.x, y: p.y, angle: p.angle, timestamp: 0 });
    });
    this.state.asteroids.forEach((a: Asteroid, id: string) => {
        snapshot.set(id, { tick: this.state.serverTick, x: a.x, y: a.y, timestamp: 0 });
    });
    this.stateHistory.set(this.state.serverTick, snapshot);
    if (this.stateHistory.size > 60) {
        const oldestTick = this.state.serverTick - 60;
        this.stateHistory.delete(oldestTick);
    }

    // 7. Check Game Over to broadcast replay
    if (this.state.gameOver && this.replayFrames.length > 0) {
        this.broadcast("replay", {
            version: 1,
            roomId: this.roomId,
            startTick: this.replayFrames[0].tick,
            endTick: this.state.serverTick,
            frames: this.replayFrames
        });
        this.replayFrames = []; // Clear after broadcast
    }
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
    this.state.asteroids.forEach((_, id) => {
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
    });
    this.state.bullets.forEach((_, id) => {
        if (!currentBulletIds.has(id)) this.state.bullets.delete(id);
    });

    const gameState = this.world.getSingleton<Component>("GameState");
    if (gameState && this.state.players.size > 0) {
        // Simple game over check
        let anyAlive = false;
        this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
        if (!anyAlive && this.state.gameStarted) this.state.gameOver = true;
    }
  }
}

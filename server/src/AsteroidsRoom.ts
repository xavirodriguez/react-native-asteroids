import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";
import { InputFrame, EntitySnapshot, ReplayFrame } from "./NetTypes";
import { RandomService } from "./RandomService";
import { PhysicsUtils } from "./PhysicsUtils";
import { ShipPhysics } from "./ShipPhysics";

export class AsteroidsRoom extends Room<AsteroidsState> {
  maxClients = 4;
  private fixedTimeStep = 16.66; // 60 FPS
  private inputBuffers = new Map<string, InputFrame[]>();
  private stateHistory = new Map<number, Map<string, EntitySnapshot>>();
  private replayFrames: ReplayFrame[] = [];
  private random: RandomService;

  onCreate(options: any) {
    this.state = new AsteroidsState();
    this.state.seed = options.seed || Math.floor(Math.random() * 0xFFFFFFFF);
    this.random = new RandomService(this.state.seed);

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
        timestamp: Date.now()
      });
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.spawnAsteroids(6);
    });

    this.onMessage("shoot", (client, data: { tick: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;

      // Lag compensation: check hit against historical state
      const historicState = this.stateHistory.get(data.tick);
      if (historicState) {
          // Calculate bullet trajectory (simplified: instant hitscan for validation)
          const originX = player.x;
          const originY = player.y;
          const angle = player.angle;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);

          let hitDetected = false;
          historicState.forEach((target, targetId) => {
              if (targetId === client.sessionId) return;

              // Simple circle collision check for lag compensation
              const dx = target.x - originX;
              const dy = target.y - originY;
              const distSq = dx * dx + dy * dy;
              const radius = 30; // Asteroid radius

              // This is a very basic "is it roughly in front of me" check
              // for a real hitscan we'd use ray-circle intersection
              if (distSq < radius * radius * 4) {
                  const dot = (dx * dirX + dy * dirY) / Math.sqrt(distSq);
                  if (dot > 0.95) { // Roughly facing the target
                      const asteroid = this.state.asteroids.get(targetId);
                      if (asteroid) {
                          this.state.asteroids.delete(targetId);
                          player.score += 100;
                          hitDetected = true;
                      }
                  }
              }
          });

          if (!hitDetected) {
              this.spawnBullet(client.sessionId, player);
          }
      } else {
          this.spawnBullet(client.sessionId, player);
      }
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${this.clients.length}`;
    player.x = this.random.nextRange(0, this.state.gameWidth);
    player.y = this.random.nextRange(0, this.state.gameHeight);
    player.angle = 0;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, code: number) {
    try {
      if (code === CloseCode.CONSENTED) throw new Error("consented leave");
      await this.allowReconnection(client, 10);
    } catch (e) {
      this.state.players.delete(client.sessionId);
      this.inputBuffers.delete(client.sessionId);
    }
  }

  update(dt: number) {
    if (!this.state.gameStarted) return;
    this.state.serverTick++;
    this.state.lastProcessedTick = this.state.serverTick;

    const dtSec = dt / 1000;

    // 1. Process Inputs
    this.state.players.forEach((player: Player, sessionId: string) => {
      if (!player.alive) return;

      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        // Process frames that match current server tick or older (late frames)
        const framesToProcess = buffer.filter(f => f.tick <= this.state.serverTick);
        framesToProcess.forEach(frame => {
          this.applyPlayerInput(player, frame, dtSec);
        });
        // Keep only future frames
        this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > this.state.serverTick));
      }

      // Global physics integration (Friction and movement outside of input block)
      PhysicsUtils.applyFriction(player as any, 0.99, dt);
      this.integratePosition(player, dtSec);
      this.applyWrapping(player);
    });

    // 2. Move asteroids
    this.state.asteroids.forEach((asteroid: Asteroid) => {
      PhysicsUtils.integrateMovement(asteroid, asteroid, dtSec);
      this.applyWrapping(asteroid);
    });

    // 3. Move bullets
    this.state.bullets.forEach((bullet: Bullet, id: string) => {
      PhysicsUtils.integrateMovement(bullet, bullet, dtSec);
      if (bullet.x < 0 || bullet.x > this.state.gameWidth || bullet.y < 0 || bullet.y > this.state.gameHeight) {
        this.state.bullets.delete(id);
      }
    });

    // 4. Collision detection (Authoritative)
    this.checkCollisions();

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
        events: [] // We could add events here (e.g. game start, collisions)
    });

    // Limit replay to 5 minutes (5 * 60 * 60 = 18000 ticks)
    if (this.replayFrames.length > 18000) {
        this.replayFrames.shift();
    }

    // 6. Store history for lag compensation
    const snapshot = new Map<string, EntitySnapshot>();
    this.state.players.forEach((p: Player, id: string) => {
        snapshot.set(id, { tick: this.state.serverTick, x: p.x, y: p.y, angle: p.angle, timestamp: Date.now() });
    });
    this.state.asteroids.forEach((a: Asteroid, id: string) => {
        snapshot.set(id, { tick: this.state.serverTick, x: a.x, y: a.y, timestamp: Date.now() });
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

  private applyPlayerInput(player: Player, frame: InputFrame, dtSec: number) {
    const rotateLeft = frame.actions.includes("rotateLeft") || frame.axes.rotate_left > 0;
    const rotateRight = frame.actions.includes("rotateRight") || frame.axes.rotate_right > 0;
    const thrust = frame.actions.includes("thrust") || frame.axes.thrust > 0;
    const shoot = frame.actions.includes("shoot");

    const intent = { rotateLeft, rotateRight, thrust };
    const renderProxy = { rotation: player.angle };
    const velocityProxy = { dx: player.velocityX, dy: player.velocityY };

    ShipPhysics.applyRotation(renderProxy, intent, dtSec);
    ShipPhysics.applyThrust(null, null, velocityProxy, renderProxy, intent, dtSec);

    player.angle = renderProxy.rotation;
    player.velocityX = velocityProxy.dx;
    player.velocityY = velocityProxy.dy;

    if (shoot) {
      this.spawnBullet(player.sessionId, player);
    }
  }


  private applyWrapping(entity: any) {
    if (entity.x < 0) entity.x = this.state.gameWidth;
    if (entity.x > this.state.gameWidth) entity.x = 0;
    if (entity.y < 0) entity.y = this.state.gameHeight;
    if (entity.y > this.state.gameHeight) entity.y = 0;
  }

  private checkCollisions() {
    // Bullet vs Asteroid
    this.state.bullets.forEach((bullet: Bullet, bulletId: string) => {
      this.state.asteroids.forEach((asteroid: Asteroid, asteroidId: string) => {
        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        if (Math.sqrt(dx*dx + dy*dy) < 30) {
          this.state.bullets.delete(bulletId);
          this.state.asteroids.delete(asteroidId);
          const owner = this.state.players.get(bullet.ownerId);
          if (owner) owner.score += 100;
        }
      });
    });

    // Player vs Asteroid
    this.state.players.forEach((player: Player) => {
      if (!player.alive) return;
      this.state.asteroids.forEach((asteroid: Asteroid) => {
        const dx = player.x - asteroid.x;
        const dy = player.y - asteroid.y;
        if (Math.sqrt(dx*dx + dy*dy) < 25) {
          player.lives--;
          player.x = this.state.gameWidth / 2;
          player.y = this.state.gameHeight / 2;
          player.velocityX = 0;
          player.velocityY = 0;
          if (player.lives <= 0) player.alive = false;
        }
      });
    });

    if (this.state.asteroids.size === 0 && this.state.gameStarted) {
      this.spawnAsteroids(6);
    }
  }

  private generateId(): string {
    return Math.floor(this.random.next() * 0xFFFFFFFFFF).toString(36);
  }

  spawnBullet(ownerId: string, player: Player) {
    const bullet = new Bullet();
    bullet.ownerId = ownerId;
    bullet.x = player.x;
    bullet.y = player.y;
    bullet.velocityX = Math.cos(player.angle) * 400;
    bullet.velocityY = Math.sin(player.angle) * 400;
    this.state.bullets.set(this.generateId(), bullet);
  }

  spawnAsteroids(count: number) {
    for(let i=0; i<count; i++) {
      const asteroid = new Asteroid();
      asteroid.id = this.generateId();
      asteroid.x = this.random.nextRange(0, this.state.gameWidth);
      asteroid.y = this.random.nextRange(0, this.state.gameHeight);
      asteroid.velocityX = this.random.nextRange(-75, 75);
      asteroid.velocityY = this.random.nextRange(-75, 75);
      asteroid.size = 3;
      this.state.asteroids.set(asteroid.id, asteroid);
    }
  }
}

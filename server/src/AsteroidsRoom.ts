import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";

export class AsteroidsRoom extends Room<AsteroidsState> {
  maxClients = 4;
  private fixedTimeStep = 16.66; // 60 FPS
  private inputBuffers = new Map<string, any[]>();

  onCreate(options: any) {
    this.state = new AsteroidsState();
    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    this.setPatchRate(50); // 20 FPS network patches
    this.setSimulationInterval((dt) => this.update(dt), this.fixedTimeStep);

    this.onMessage("input", (client, data) => {
      const buffer = this.inputBuffers.get(client.sessionId) || [];
      buffer.push({ ...data, tickId: data.tickId });
      this.inputBuffers.set(client.sessionId, buffer);
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.spawnAsteroids(6);
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${this.clients.length}`;
    player.x = Math.random() * this.state.gameWidth;
    player.y = Math.random() * this.state.gameHeight;
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

    const dtSec = dt / 1000;

    // 1. Process Inputs
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;

      const buffer = this.inputBuffers.get(sessionId);
      // Process all pending inputs in the buffer to handle network bursts
      while (buffer && buffer.length > 0) {
        const input = buffer.shift();
        this.applyPlayerInput(player, input, dtSec);
      }

      // Global physics integration (Friction and movement outside of input block)
      player.velocityX *= 0.99;
      player.velocityY *= 0.99;
      this.integratePosition(player, dtSec);
      this.applyWrapping(player);
    });

    // 2. Move asteroids
    this.state.asteroids.forEach((asteroid) => {
      this.integratePosition(asteroid, dtSec);
      this.applyWrapping(asteroid);
    });

    // 3. Move bullets
    this.state.bullets.forEach((bullet, id) => {
      this.integratePosition(bullet, dtSec);
      if (bullet.x < 0 || bullet.x > this.state.gameWidth || bullet.y < 0 || bullet.y > this.state.gameHeight) {
        this.state.bullets.delete(id);
      }
    });

    // 4. Collision detection (Authoritative)
    this.checkCollisions();
  }

  private applyPlayerInput(player: Player, data: any, dtSec: number) {
    if (data.rotateLeft) player.angle -= 3 * dtSec;
    if (data.rotateRight) player.angle += 3 * dtSec;
    if (data.thrust) {
      player.velocityX += Math.cos(player.angle) * 200 * dtSec;
      player.velocityY += Math.sin(player.angle) * 200 * dtSec;
    }
    if (data.shoot) {
      this.spawnBullet(player.sessionId, player);
    }
  }

  private integratePosition(entity: any, dtSec: number) {
    entity.x += entity.velocityX * dtSec;
    entity.y += entity.velocityY * dtSec;
  }

  private applyWrapping(entity: any) {
    if (entity.x < 0) entity.x = this.state.gameWidth;
    if (entity.x > this.state.gameWidth) entity.x = 0;
    if (entity.y < 0) entity.y = this.state.gameHeight;
    if (entity.y > this.state.gameHeight) entity.y = 0;
  }

  private checkCollisions() {
    // Bullet vs Asteroid
    this.state.bullets.forEach((bullet, bulletId) => {
      this.state.asteroids.forEach((asteroid, asteroidId) => {
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
    this.state.players.forEach((player) => {
      if (!player.alive) return;
      this.state.asteroids.forEach((asteroid) => {
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

  spawnBullet(ownerId: string, player: Player) {
    const bullet = new Bullet();
    bullet.ownerId = ownerId;
    bullet.x = player.x;
    bullet.y = player.y;
    bullet.velocityX = Math.cos(player.angle) * 400;
    bullet.velocityY = Math.sin(player.angle) * 400;
    this.state.bullets.set(Math.random().toString(36).substring(7), bullet);
  }

  spawnAsteroids(count: number) {
    for(let i=0; i<count; i++) {
      const asteroid = new Asteroid();
      asteroid.id = Math.random().toString(36).substring(7);
      asteroid.x = Math.random() * this.state.gameWidth;
      asteroid.y = Math.random() * this.state.gameHeight;
      asteroid.velocityX = (Math.random() - 0.5) * 150;
      asteroid.velocityY = (Math.random() - 0.5) * 150;
      asteroid.size = 3;
      this.state.asteroids.set(asteroid.id, asteroid);
    }
  }
}

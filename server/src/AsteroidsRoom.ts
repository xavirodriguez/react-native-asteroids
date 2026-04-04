import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";

export class AsteroidsRoom extends Room<AsteroidsState> {
  maxClients = 4;

  onCreate(options: any) {
    this.state = new AsteroidsState();
    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));

    this.onMessage("input", (client, data: {
      thrust: boolean;
      rotateLeft: boolean;
      rotateRight: boolean;
      shoot: boolean;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;

      const dt = 16.66 / 1000;
      if (data.rotateLeft) player.angle -= 3 * dt;
      if (data.rotateRight) player.angle += 3 * dt;
      if (data.thrust) {
        player.velocityX += Math.cos(player.angle) * 200 * dt;
        player.velocityY += Math.sin(player.angle) * 200 * dt;
      }
      if (data.shoot) {
          this.spawnBullet(client.sessionId, player);
      }
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.spawnAsteroids(6);
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.x = Math.random() * this.state.gameWidth;
    player.y = Math.random() * this.state.gameHeight;
    player.angle = 0;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    player.name = options.name || `Player ${this.clients.length}`;
    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, code: number) {
    try {
      if (code === CloseCode.CONSENTED) throw new Error("consented leave");
      await this.allowReconnection(client, 10);
    } catch (e) {
      this.state.players.delete(client.sessionId);
    }
  }

  update(deltaTime: number) {
    if (!this.state.gameStarted) return;

    const dt = deltaTime / 1000;

    // Move players
    this.state.players.forEach((player) => {
      if (!player.alive) return;
      player.x += player.velocityX * dt;
      player.y += player.velocityY * dt;
      player.velocityX *= 0.99;
      player.velocityY *= 0.99;

      if (player.x < 0) player.x = this.state.gameWidth;
      if (player.x > this.state.gameWidth) player.x = 0;
      if (player.y < 0) player.y = this.state.gameHeight;
      if (player.y > this.state.gameHeight) player.y = 0;
    });

    // Move asteroids
    this.state.asteroids.forEach((asteroid) => {
        asteroid.x += asteroid.velocityX * dt;
        asteroid.y += asteroid.velocityY * dt;

        if (asteroid.x < 0) asteroid.x = this.state.gameWidth;
        if (asteroid.x > this.state.gameWidth) asteroid.x = 0;
        if (asteroid.y < 0) asteroid.y = this.state.gameHeight;
        if (asteroid.y > this.state.gameHeight) asteroid.y = 0;
    });

    // Move bullets
    this.state.bullets.forEach((bullet, id) => {
        bullet.x += bullet.velocityX * dt;
        bullet.y += bullet.velocityY * dt;

        if (bullet.x < 0 || bullet.x > this.state.gameWidth || bullet.y < 0 || bullet.y > this.state.gameHeight) {
            this.state.bullets.delete(id);
        }
    });

    // Collision detection - Bullet vs Asteroid
    const bulletsToRemove = new Set<string>();
    const asteroidsToRemove = new Set<string>();

    this.state.bullets.forEach((bullet, bulletId) => {
        this.state.asteroids.forEach((asteroid, asteroidId) => {
            if (asteroidsToRemove.has(asteroidId)) return;
            const dx = bullet.x - asteroid.x;
            const dy = bullet.y - asteroid.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 30) {
                bulletsToRemove.add(bulletId);
                asteroidsToRemove.add(asteroidId);
                const owner = this.state.players.get(bullet.ownerId);
                if (owner) owner.score += 100;
            }
        });
    });

    bulletsToRemove.forEach(id => this.state.bullets.delete(id));
    asteroidsToRemove.forEach(id => this.state.asteroids.delete(id));

    // Respawn asteroid if none left (after all deletions)
    if (this.state.asteroids.size === 0 && this.state.gameStarted) {
        this.spawnAsteroids(6);
    }

    // Ship vs Asteroid collision
    this.state.players.forEach((player, sessionId) => {
        if (!player.alive) return;
        this.state.asteroids.forEach((asteroid) => {
            const dx = player.x - asteroid.x;
            const dy = player.y - asteroid.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 25) {
                player.lives--;
                player.x = this.state.gameWidth / 2;
                player.y = this.state.gameHeight / 2;
                player.velocityX = 0;
                player.velocityY = 0;
                if (player.lives <= 0) {
                    player.alive = false;
                }
            }
        });
    });
  }

  spawnBullet(ownerId: string, player: Player) {
      // Cooldown check could be here
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

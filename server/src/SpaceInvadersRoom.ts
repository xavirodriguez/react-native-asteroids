import { Room, type Client } from "@colyseus/core";
import { SpaceInvadersState, Player, Invader, SpaceInvadersBullet } from "./schema/GameState";

export class SpaceInvadersRoom extends Room<SpaceInvadersState> {
  maxClients = 4;
  direction = 1;
  lastMove = 0;
  bulletSpeed = 400;
  shootCooldown = 500;
  playerCooldowns = new Map<string, number>();

  onCreate(__unused: Record<string, unknown>) {
    this.state = new SpaceInvadersState();
    this.state.gameStarted = false;
    this.state.gameOver = false;

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));

    this.onMessage("input", (client, data: {
      moveLeft: boolean;
      moveRight: boolean;
      shoot: boolean;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;

      const dt = 16.66 / 1000;
      if (data.moveLeft) player.x -= 300 * dt;
      if (data.moveRight) player.x += 300 * dt;

      if (player.x < 50) player.x = 50;
      if (player.x > 750) player.x = 750;

      if (data.shoot) {
        const now = Date.now();
        const lastShoot = this.playerCooldowns.get(client.sessionId) || 0;
        if (now - lastShoot > this.shootCooldown) {
          this.spawnBullet(client.sessionId, player.x, player.y - 20);
          this.playerCooldowns.set(client.sessionId, now);
        }
      }
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.state.gameOver = false;
      this.state.invaders.clear();
      this.state.bullets.clear();
      this.spawnInvaders();
      this.state.players.forEach(p => {
        p.score = 0;
        p.lives = 3;
        p.alive = true;
      });
    });
  }

  onJoin(client: Client, _options: Record<string, unknown>) {
    const player = new Player();
    player.x = 400;
    player.y = 550;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    player.name = (_options.name as string) || `Invader ${this.clients.length}`;
    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, _code: number) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number) {
    if (!this.state.gameStarted || this.state.gameOver) return;
    const dt = deltaTime / 1000;

    // Move invaders
    this.lastMove += deltaTime;
    if (this.lastMove > 500) {
        this.lastMove = 0;
        let bump = false;
        this.state.invaders.forEach(inv => {
            if (!inv.alive) return;
            inv.x += 20 * this.direction;
            if (inv.x > 750 || inv.x < 50) bump = true;
        });

        if (bump) {
            this.direction *= -1;
            this.state.invaders.forEach(inv => {
                if (!inv.alive) return;
                inv.y += 20;
                if (inv.y > 500) {
                    this.state.gameOver = true;
                }
            });
        }
    }

    // Move bullets
    this.state.bullets.forEach((bullet, id) => {
        bullet.y -= this.bulletSpeed * dt;

        // Collision with invaders
        this.state.invaders.forEach(inv => {
            if (inv.alive &&
                bullet.x > inv.x - 15 && bullet.x < inv.x + 15 &&
                bullet.y > inv.y - 15 && bullet.y < inv.y + 15) {
                inv.alive = false;
                this.state.bullets.delete(id);
                const player = this.state.players.get(bullet.ownerId);
                if (player) player.score += 10;
            }
        });

        if (bullet.y < 0) {
            this.state.bullets.delete(id);
        }
    });

    // Check win condition
    let anyInvader = false;
    this.state.invaders.forEach(inv => { if (inv.alive) anyInvader = true; });
    if (!anyInvader) {
        this.spawnInvaders(); // Next wave
    }
  }

  spawnBullet(ownerId: string, x: number, y: number) {
    const bullet = new SpaceInvadersBullet();
    bullet.ownerId = ownerId;
    bullet.x = x;
    bullet.y = y;
    const id = Math.random().toString(36).substring(2, 9);
    this.state.bullets.set(id, bullet);
  }

  spawnInvaders() {
    this.state.invaders.clear();
    for (let i = 0; i < 55; i++) {
      const invader = new Invader();
      invader.id = i.toString();
      invader.x = 100 + (i % 11) * 50;
      invader.y = 100 + Math.floor(i / 11) * 40;
      invader.alive = true;
      this.state.invaders.set(invader.id, invader);
    }
  }
}

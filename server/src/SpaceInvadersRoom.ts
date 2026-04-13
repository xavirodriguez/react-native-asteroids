import { Room, type Client } from "@colyseus/core";
import { SpaceInvadersState, Player, Invader } from "./schema/GameState";

export class SpaceInvadersRoom extends Room<SpaceInvadersState> {
  maxClients = 4;
  direction = 1;
  lastMove = 0;

  onCreate(_options: any) {
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
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.spawnInvaders();
    });
  }

  onJoin(client: Client, _options: any) {
    const player = new Player();
    player.x = 400;
    player.y = 550;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    player.name = options.name || `Invader ${this.clients.length}`;
    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, _code: number) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number) {
    if (!this.state.gameStarted) return;

    this.lastMove += deltaTime;
    if (this.lastMove > 500) {
        this.lastMove = 0;
        let bump = false;
        this.state.invaders.forEach(inv => {
            inv.x += 20 * this.direction;
            if (inv.x > 750 || inv.x < 50) bump = true;
        });

        if (bump) {
            this.direction *= -1;
            this.state.invaders.forEach(inv => {
                inv.y += 20;
                if (inv.y > 500) {
                    this.state.gameOver = true;
                }
            });
        }
    }
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

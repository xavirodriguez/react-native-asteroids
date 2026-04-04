import { Room, type Client, CloseCode } from "@colyseus/core";
import { FlappyBirdState, Player, Pipe, Bird } from "./schema/GameState";

export class FlappyBirdRoom extends Room<FlappyBirdState> {
  maxClients = 8;
  pipeTimer = 0;

  onCreate(options: any) {
    this.state = new FlappyBirdState();
    this.state.gameStarted = false;
    this.state.gameOver = false;

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));

    this.onMessage("flap", (client) => {
      const bird = this.state.players.get(client.sessionId);
      if (!bird || !bird.alive) return;
      bird.velocityY = -300;
    });

    this.onMessage("start_game", () => {
      this.state.gameStarted = true;
      this.state.pipes.clear();
      this.state.players.forEach(p => {
          p.y = 300;
          p.velocityY = 0;
          p.alive = true;
          p.score = 0;
      });
    });
  }

  onJoin(client: Client, options: any) {
    const bird = new Player();
    bird.x = 100;
    bird.y = 300;
    bird.velocityY = 0;
    bird.score = 0;
    bird.alive = true;
    bird.name = options.name || `Bird ${this.clients.length}`;
    this.state.players.set(client.sessionId, bird);
  }

  onLeave(client: Client, code: number) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number) {
    if (!this.state.gameStarted) return;
    const dt = deltaTime / 1000;

    this.state.players.forEach((bird) => {
        if (!bird.alive) return;
        bird.y += bird.velocityY * dt;
        bird.velocityY += 800 * dt;

        if (bird.y > 580) {
            bird.y = 580;
            bird.alive = false;
        }
        if (bird.y < 0) bird.y = 0;
    });

    this.pipeTimer += deltaTime;
    if (this.pipeTimer > 1500) {
        this.pipeTimer = 0;
        this.spawnPipe();
    }

    this.state.pipes.forEach((pipe, id) => {
        pipe.x -= 150 * dt;

        // Scoring
        this.state.players.forEach(bird => {
            if (bird.alive && bird.x > pipe.x + 60 && !pipe.id.includes("scored_" + bird.name)) {
                bird.score += 1;
                // Simple way to mark as scored for this bird
                // Note: This is a bit hacky for a MapSchema
            }
        });

        if (pipe.x < -100) {
            this.state.pipes.delete(id);
        }

        // Collision with birds
        this.state.players.forEach(bird => {
            if (!bird.alive) return;
            if (bird.x + 15 > pipe.x && bird.x - 15 < pipe.x + 60) {
                if (bird.y - 15 < pipe.gapY - 70 || bird.y + 15 > pipe.gapY + 70) {
                    bird.alive = false;
                }
            }
        });
    });
  }

  spawnPipe() {
      const pipe = new Pipe();
      pipe.id = Math.random().toString(36).substring(7);
      pipe.x = 450;
      pipe.gapY = 150 + Math.random() * 300;
      this.state.pipes.set(pipe.id, pipe);
  }
}

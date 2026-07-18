import { World } from "../../../index";
import { TransformComponent } from "../../../index";
import { type PongInput } from "../types";

/**
 * IA extremadamente básica para Pong.
 * Intenta seguir la posición Y de la bola con un retraso y error aleatorio.
 */
export class AIPongController {
  private difficulty: "easy" | "medium" | "hard";
  private lastUpdateTime = 0;
  private targetY = 300;
  private reactionDelay: number;
  private errorMargin: number;

  constructor(difficulty: "easy" | "medium" | "hard" = "medium") {
    this.difficulty = difficulty;

    switch (difficulty) {
      case "easy":
        this.reactionDelay = 300;
        this.errorMargin = 50;
        break;
      case "medium":
        this.reactionDelay = 150;
        this.errorMargin = 20;
        break;
      case "hard":
        this.reactionDelay = 50;
        this.errorMargin = 5;
        break;
    }
  }

  public update(world: World, currentTime: number): Partial<PongInput> {
    const input: Partial<PongInput> = {
      p2Up: false,
      p2Down: false
    };

    // Solo actualizar el objetivo cada X ms para simular tiempo de reacción
    if (currentTime - this.lastUpdateTime > this.reactionDelay) {
      const balls = world.query("Ball" as any, "Transform" as any);
      if (balls.length > 0) {
        const ballPos = world.getComponent(balls[0], "Transform" as any) as TransformComponent;
        this.targetY = ballPos.y + (world.gameplayRandom.next() - 0.5) * this.errorMargin * 2;
      }
      this.lastUpdateTime = currentTime;
    }

    const paddles = world.query("Paddle" as any, "Tag" as any, "Transform" as any);
    const rightPaddle = paddles.find(p => {
        const tags = world.getComponent(p, "Tag" as any) as any;
        return tags.tags.includes("right");
    });

    if (rightPaddle !== undefined) {
      const paddlePos = world.getComponent(rightPaddle, "Transform" as any) as TransformComponent;
      const threshold = 10;

      if (paddlePos.y < this.targetY - threshold) {
        input.p2Down = true;
      } else if (paddlePos.y > this.targetY + threshold) {
        input.p2Up = true;
      }
    }

    return input;
  }
}

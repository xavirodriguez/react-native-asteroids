import { InputController } from "../../../engine/legacy/InputController";
import { World } from "../../../engine/core/World";
import { TransformComponent } from "../../../engine/types/EngineTypes";
import { PongInput } from "../types";

export type AIDifficulty = "easy" | "medium" | "hard";

/**
 * AI Agent for Pong that acts as an InputController.
 * Follows the ball vertically with configurable difficulty.
 */
export class AIPongController extends InputController<PongInput> {
  private difficulty: AIDifficulty;
  private lastUpdate = 0;
  private reactionDelay = 0; // ms
  private errorMargin = 0;   // pixels

  constructor(difficulty: AIDifficulty = "medium") {
    super();
    this.difficulty = difficulty;
    this.applyDifficultySettings();
  }

  private applyDifficultySettings() {
    switch (this.difficulty) {
      case "easy":
        this.reactionDelay = 200;
        this.errorMargin = 40;
        break;
      case "medium":
        this.reactionDelay = 100;
        this.errorMargin = 15;
        break;
      case "hard":
        this.reactionDelay = 0;
        this.errorMargin = 5;
        break;
    }
  }

  setup(): void {}
  cleanup(): void {}

  /**
   * AI perceives the world and decides inputs.
   * Note: In a real game loop, we'd pass the world or a snapshot.
   * For this ECS, we'll assume the update method will be called by the game.
   */
  public update(world: World, currentTime: number): void {
    if (currentTime - this.lastUpdate < this.reactionDelay) return;
    this.lastUpdate = currentTime;

    const ball = world.query("Ball", "Transform", "Velocity")[0];
    const paddle = world.query("Paddle", "Transform", "Tag").find(e => {
        const tags = world.getComponent<import("../../../engine/types/EngineTypes").TagComponent>(e, "Tag")!.tags;
        return tags.includes("right"); // AI usually controls P2
    });

    if (!ball || !paddle) return;

    const ballPos = world.getComponent<TransformComponent>(ball, "Transform")!;
    const paddlePos = world.getComponent<TransformComponent>(paddle, "Transform")!;

    const newState: Partial<PongInput> = { p2Up: false, p2Down: false };

    const targetY = ballPos.y;
    const diff = targetY - paddlePos.y;

    if (Math.abs(diff) > this.errorMargin) {
      if (diff < 0) newState.p2Up = true;
      else newState.p2Down = true;
    }

    this.setInputs(newState);
  }
}

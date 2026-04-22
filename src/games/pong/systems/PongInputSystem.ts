import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { VelocityComponent, TagComponent, InputStateComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG, type PongInput } from "../types";
import { InputUtils } from "../../../engine/utils/ComponentUtils";
import { AIPongController } from "../input/AIPongController";

/**
 * System that translates aggregated input into paddle movement.
 * Includes AI support for the right paddle if configured.
 */
export class PongInputSystem extends System {
  private aiController?: AIPongController;

  constructor(aiDifficulty?: "easy" | "medium" | "hard") {
    super();
    if (aiDifficulty) {
      this.aiController = new AIPongController(aiDifficulty);
    }
  }

  private currentTick = 0;
  private currentTime = 0;

  public update(world: World, deltaTime: number): void {
    this.currentTick++;
    this.currentTime += deltaTime;

    const inputState = world.getSingleton<InputStateComponent>("InputState");
    const paddles = world.query("Paddle", "Velocity", "Tag");

    let aiInputs: Partial<PongInput> | undefined;
    if (this.aiController) {
      aiInputs = this.aiController.update(world, this.currentTime);
    }

    paddles.forEach(entity => {
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const tags = world.getComponent<TagComponent>(entity, "Tag")!;

      let moveDir = 0;

      if (tags.tags.includes("left")) {
        if (inputState) {
          if (InputUtils.isPressed(inputState, "p1Up")) moveDir -= 1;
          if (InputUtils.isPressed(inputState, "p1Down")) moveDir += 1;
        }
      } else if (tags.tags.includes("right")) {
        if (this.aiController && aiInputs) {
          if (aiInputs.p2Up) moveDir -= 1;
          if (aiInputs.p2Down) moveDir += 1;
        } else if (inputState) {
          if (InputUtils.isPressed(inputState, "p2Up")) moveDir -= 1;
          if (InputUtils.isPressed(inputState, "p2Down")) moveDir += 1;
        }
      }

      vel.dy = moveDir * PONG_CONFIG.PADDLE_SPEED;
    });
  }
}

import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { VelocityComponent, TagComponent, InputStateComponent } from "../../../engine/types/EngineTypes";
import { type PongInput } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { InputUtils } from "../../../engine/utils/ComponentUtils";
import { AIPongController } from "../input/AIPongController";
import { NetworkController } from "../input/NetworkController";

/**
 * System that translates aggregated input into paddle movement.
 * Includes AI support for the right paddle if configured.
 */
export class PongInputSystem extends System {
  private aiController?: AIPongController;
  private networkController?: NetworkController;
  private config?: PongConfig;

  constructor(aiDifficulty?: "easy" | "medium" | "hard", networkController?: NetworkController) {
    super();
    if (aiDifficulty) {
      this.aiController = new AIPongController(aiDifficulty);
    }
    this.networkController = networkController;
  }

  public currentTick = 0;
  private currentTime = 0;

  public update(world: World, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<PongConfig>("GameConfig")!;
    }
    this.currentTick++;
    this.currentTime += deltaTime;

    const inputState = world.getSingleton<InputStateComponent>("InputState");
    const paddles = world.query("Paddle", "Velocity", "Tag");

    let aiInputs: Partial<PongInput> | undefined;
    if (this.aiController) {
      aiInputs = this.aiController.update(world, this.currentTime);
    }

    paddles.forEach(entity => {
      const tags = world.getComponent<TagComponent>(entity, "Tag")!;

      let moveDir = 0;

      if (tags.tags.includes("left")) {
        if (inputState) {
          if (InputUtils.isPressed(inputState, "p1Up")) moveDir -= 1;
          if (InputUtils.isPressed(inputState, "p1Down")) moveDir += 1;
        }
      } else if (tags.tags.includes("right")) {
        if (this.networkController) {
          const networkInput = this.networkController.getInputForTick(this.currentTick);
          if (networkInput) {
            if (networkInput.p2Up) moveDir -= 1;
            if (networkInput.p2Down) moveDir += 1;
          }
        } else if (this.aiController && aiInputs) {
          if (aiInputs.p2Up) moveDir -= 1;
          if (aiInputs.p2Down) moveDir += 1;
        } else if (inputState) {
          if (InputUtils.isPressed(inputState, "p2Up")) moveDir -= 1;
          if (InputUtils.isPressed(inputState, "p2Down")) moveDir += 1;
        }
      }

      world.mutateComponent<VelocityComponent>(entity, "Velocity", vel => {
        vel.dy = moveDir * this.config!.PADDLE_SPEED;
      });
    });
  }
}

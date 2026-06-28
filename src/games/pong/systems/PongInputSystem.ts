import { World } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { VelocityComponent, TagComponent, InputStateComponent } from "@tiny-aster/core";
import { type PongInput, type PongComponentRegistry } from "../types";
import { PongConfig, DEFAULT_PONG_CONFIG } from "../types/PongConfigSchema";
import { AIPongController } from "../input/AIPongController";
import { NetworkController } from "../input/NetworkController";

/**
 * System that translates aggregated input into paddle movement.
 * Includes AI support for the right paddle if configured.
 */
export class PongInputSystem extends System<PongComponentRegistry> {
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

  public update(world: World<PongComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<PongConfig>("GameConfig") || DEFAULT_PONG_CONFIG;
    }
    this.currentTick++;
    this.currentTime += deltaTime;

    const inputState = world.getSingleton("InputState");
    const paddles = world.query("Paddle", "Velocity", "Tag");

    let aiInputs: Partial<PongInput> | undefined;
    if (this.aiController) {
      aiInputs = this.aiController.update(world, this.currentTime);
    }

    paddles.forEach(entity => {
      const tags = world.getComponent(entity, "Tag")!;

      let moveDir = 0;

      if (tags.tags.includes("left")) {
        if (inputState) {
          if (inputState.buttons["p1Up"]) moveDir -= 1;
          if (inputState.buttons["p1Down"]) moveDir += 1;
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
          if (inputState.buttons["p2Up"]) moveDir -= 1;
          if (inputState.buttons["p2Down"]) moveDir += 1;
        }
      }

      world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        vel.vy = moveDir * (this.config?.PADDLE_SPEED ?? DEFAULT_PONG_CONFIG.PADDLE_SPEED);
      });
    });
  }
}

import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { VelocityComponent, TagComponent, InputStateComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG } from "../types";
import { InputUtils } from "../../../engine/utils/ComponentUtils";

/**
 * System that translates aggregated input into paddle movement.
 */
export class PongInputSystem extends System {
  constructor() {
    super();
  }

  private currentTick = 0;

  public update(world: World, deltaTime: number): void {
    this.currentTick++;

    const inputState = world.getSingleton<InputStateComponent>("InputState");
    const paddles = world.query("Paddle", "Velocity", "Tag");

    paddles.forEach(entity => {
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const tags = world.getComponent<TagComponent>(entity, "Tag")!;

      let moveDir = 0;
      if (inputState) {
        if (tags.tags.includes("left")) {
          if (InputUtils.isPressed(inputState, "p1Up")) moveDir -= 1;
          if (InputUtils.isPressed(inputState, "p1Down")) moveDir += 1;
        } else if (tags.tags.includes("right")) {
          if (InputUtils.isPressed(inputState, "p2Up")) moveDir -= 1;
          if (InputUtils.isPressed(inputState, "p2Down")) moveDir += 1;
        }
      }

      vel.dy = moveDir * PONG_CONFIG.PADDLE_SPEED;
    });
  }
}

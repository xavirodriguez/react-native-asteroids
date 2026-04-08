import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { InputManager } from "../../../engine/input/InputManager";
import { VelocityComponent, TagComponent } from "../../../engine/types/EngineTypes";
import { PongInput, PONG_CONFIG } from "../types";

/**
 * System that translates aggregated input into paddle movement.
 */
export class PongInputSystem extends System {
  constructor(private inputManager: InputManager<PongInput>) {
    super();
  }

  private currentTick = 0;

  public update(world: World, deltaTime: number): void {
    this.currentTick++;

    // Update any controllers that require a frame update (like AI or Network)
    // We use a deterministic currentTime based on ticks (16.66ms per tick @ 60fps)
    const deterministicTime = this.currentTick * (1000 / 60);

    // Check if we are in online mode and if we have inputs for the current tick
    const networkController = (this.inputManager as any).controllers.find((c: any) =>
      typeof c.hasInputForTick === "function"
    );

    if (networkController && !networkController.hasInputForTick(this.currentTick)) {
      // Lockstep stall: we don't advance the simulation if inputs are missing
      this.currentTick--;
      return;
    }

    this.inputManager.update(world, deterministicTime, this.currentTick);

    const inputs = this.inputManager.getCombinedInputs();
    const paddles = world.query("Paddle", "Velocity", "Tag");

    paddles.forEach(entity => {
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const tags = world.getComponent<TagComponent>(entity, "Tag")!;

      let moveDir = 0;
      if (tags.tags.includes("left")) {
        if (inputs.p1Up) moveDir -= 1;
        if (inputs.p1Down) moveDir += 1;
      } else if (tags.tags.includes("right")) {
        if (inputs.p2Up) moveDir -= 1;
        if (inputs.p2Down) moveDir += 1;
      }

      vel.dy = moveDir * PONG_CONFIG.PADDLE_SPEED;
    });
  }
}

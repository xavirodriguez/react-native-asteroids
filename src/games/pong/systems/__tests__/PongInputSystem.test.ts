import { World } from "../../../../engine/core/World";
import { InputManager } from "../../../../engine/input/InputManager";
import { PongInputSystem } from "../PongInputSystem";
import { PongEntityFactory } from "../../EntityFactory";
import { PongInput, PONG_CONFIG } from "../../types";
import { VelocityComponent, TagComponent } from "../../../../engine/types/EngineTypes";

describe("PongInputSystem", () => {
  let world: World;
  let inputManager: InputManager<PongInput>;
  let system: PongInputSystem;

  class ManualController extends (require("../../../../engine/input/InputController").InputController) {
    setup() {}
    cleanup() {}
  }

  beforeEach(() => {
    world = new World();
    inputManager = new InputManager<PongInput>();
    inputManager.addController(new ManualController());
    system = new PongInputSystem(inputManager);

    PongEntityFactory.createPaddle(world, "left");
    PongEntityFactory.createPaddle(world, "right");
  });

  it("should move left paddle up when p1Up is true", () => {
    inputManager.setInputs({ p1Up: true });
    system.update(world, 16);

    const leftPaddle = world.query("Paddle", "Velocity", "Tag").find(e =>
      world.getComponent<TagComponent>(e, "Tag")!.tags.includes("left")
    )!;
    const vel = world.getComponent<VelocityComponent>(leftPaddle, "Velocity")!;

    expect(vel.dy).toBe(-PONG_CONFIG.PADDLE_SPEED);
  });

  it("should move right paddle down when p2Down is true", () => {
    inputManager.setInputs({ p2Down: true });
    system.update(world, 16);

    const rightPaddle = world.query("Paddle", "Velocity", "Tag").find(e =>
      world.getComponent<TagComponent>(e, "Tag")!.tags.includes("right")
    )!;
    const vel = world.getComponent<VelocityComponent>(rightPaddle, "Velocity")!;

    expect(vel.dy).toBe(PONG_CONFIG.PADDLE_SPEED);
  });
});

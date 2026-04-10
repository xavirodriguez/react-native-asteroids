import { World } from "../../../../engine/core/World";
import { PongInputSystem } from "../PongInputSystem";
import { PongEntityFactory } from "../../EntityFactory";
import { PONG_CONFIG } from "../../types";
import { VelocityComponent, TagComponent, InputStateComponent } from "../../../../engine/types/EngineTypes";

describe("PongInputSystem", () => {
  let world: World;
  let system: PongInputSystem;

  beforeEach(() => {
    world = new World();
    system = new PongInputSystem();

    const inputEntity = world.createEntity();
    world.addComponent(inputEntity, {
      type: "InputState",
      actions: new Map(),
      axes: new Map()
    } as InputStateComponent);

    PongEntityFactory.createPaddle(world, "left");
    PongEntityFactory.createPaddle(world, "right");
  });

  it("should move left paddle up when p1Up is true", () => {
    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    inputState.actions.set("p1Up", true);
    system.update(world, 16);

    const leftPaddle = world.query("Paddle", "Velocity", "Tag").find(e =>
      world.getComponent<TagComponent>(e, "Tag")!.tags.includes("left")
    )!;
    const vel = world.getComponent<VelocityComponent>(leftPaddle, "Velocity")!;

    expect(vel.dy).toBe(-PONG_CONFIG.PADDLE_SPEED);
  });

  it("should move right paddle down when p2Down is true", () => {
    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    inputState.actions.set("p2Down", true);
    system.update(world, 16);

    const rightPaddle = world.query("Paddle", "Velocity", "Tag").find(e =>
      world.getComponent<TagComponent>(e, "Tag")!.tags.includes("right")
    )!;
    const vel = world.getComponent<VelocityComponent>(rightPaddle, "Velocity")!;

    expect(vel.dy).toBe(PONG_CONFIG.PADDLE_SPEED);
  });
});

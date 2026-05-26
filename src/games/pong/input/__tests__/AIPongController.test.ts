import { World } from "../../../../engine/core/World";
import { AIPongController } from "../AIPongController";
import { PongEntityFactory } from "../../EntityFactory";
import { TransformComponent } from "../../../../engine/types/EngineTypes";

describe("AIPongController", () => {
  let world: World;
  let controller: AIPongController;

  beforeEach(() => {
    world = new World();
    controller = new AIPongController("hard"); // No delay for testing

    PongEntityFactory.createBall(world);
    PongEntityFactory.createPaddle(world, "right");
  });

  it("should signal move up when ball is above paddle", () => {
    const ball = world.query("Ball", "Transform")[0];
    const paddle = world.query("Paddle", "Transform").find(e =>
        world.getComponent<import("../../../../engine/types/EngineTypes").TagComponent>(e, "Tag")!.tags.includes("right")
    )!;

    const _ballPos = world.getComponent<TransformComponent>(ball, "Transform")!;
    const _paddlePos = world.getComponent<TransformComponent>(paddle, "Transform")!;

    world.mutateComponent<TransformComponent>(ball, "Transform", t => { t.y = 100; });
    world.mutateComponent<TransformComponent>(paddle, "Transform", t => { t.y = 300; });

    const inputs = controller.update(world, 1000);

    expect(inputs.p2Up).toBe(true);
    expect(inputs.p2Down).toBe(false);
  });

  it("should signal move down when ball is below paddle", () => {
    const ball = world.query("Ball", "Transform")[0];
    const paddle = world.query("Paddle", "Transform").find(e =>
        world.getComponent<import("../../../../engine/types/EngineTypes").TagComponent>(e, "Tag")!.tags.includes("right")
    )!;

    const _ballPos = world.getComponent<TransformComponent>(ball, "Transform")!;
    const _paddlePos = world.getComponent<TransformComponent>(paddle, "Transform")!;

    world.mutateComponent<TransformComponent>(ball, "Transform", t => { t.y = 500; });
    world.mutateComponent<TransformComponent>(paddle, "Transform", t => { t.y = 300; });

    const inputs = controller.update(world, 1000);

    expect(inputs.p2Down).toBe(true);
    expect(inputs.p2Up).toBe(false);
  });
});

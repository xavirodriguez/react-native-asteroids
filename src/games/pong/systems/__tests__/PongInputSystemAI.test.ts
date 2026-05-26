import { createTestWorld } from "../../../../engine/test-utils/createTestWorld";
import { PongInputSystem } from "../PongInputSystem";
import { PongEntityFactory } from "../../EntityFactory";
import { PONG_CONFIG } from "../../types";
import { VelocityComponent, TagComponent, TransformComponent } from "../../../../engine/types/EngineTypes";

describe("PongInputSystem AI", () => {
  let world: World;
  let system: PongInputSystem;

  beforeEach(() => {
    world = createTestWorld({ resources: { GameConfig: PONG_CONFIG } });
    system = new PongInputSystem("medium");

    PongEntityFactory.createBall(world);
    PongEntityFactory.createPaddle(world, "left");
    PongEntityFactory.createPaddle(world, "right");
  });

  it("should move right paddle according to ball position in AI mode", () => {
    const ball = world.query("Ball", "Transform")[0];
    const rightPaddle = world.query("Paddle", "Tag").find(e =>
      world.getComponent<TagComponent>(e, "Tag")!.tags.includes("right")
    )!;
    const paddleTransform = world.getComponent<TransformComponent>(rightPaddle, "Transform")!;
    const paddleVelocity = world.getComponent<VelocityComponent>(rightPaddle, "Velocity")!;

    // Place ball below paddle
    const targetY = paddleTransform.y + 100;
    world.mutateComponent<TransformComponent>(ball, "Transform", t => {
      t.y = targetY;
    });

    // First update might not move due to reaction delay, but medium has 100ms.
    // AIPongController uses currentTime (seconds or ms?)
    // In PongInputSystem: this.currentTime += deltaTime;
    // AIPongController: if (currentTime - this.lastUpdate < this.reactionDelay) return this.lastInputs;

    system.update(world, 200); // Pass enough time for reaction delay

    expect(paddleVelocity.dy).toBeGreaterThan(0);
    expect(paddleVelocity.dy).toBe(PONG_CONFIG.PADDLE_SPEED);
  });
});

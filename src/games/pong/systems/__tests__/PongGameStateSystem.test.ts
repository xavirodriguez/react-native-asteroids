import { World } from "../../../../engine/core/World";
import { PongGameStateSystem } from "../PongGameStateSystem";
import { PongState, PONG_CONFIG } from "../../types";
import { TransformComponent, VelocityComponent } from "../../../../engine/types/EngineTypes";

describe("PongGameStateSystem", () => {
  let world: World;
  let system: PongGameStateSystem;
  let stateEntity: number;

  beforeEach(() => {
    world = new World();
    system = new PongGameStateSystem();
    stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "PongState",
      scoreP1: 0,
      scoreP2: 0,
      isGameOver: false,
      comboMultiplier: 1
    } as import("../../../pong/types").PongState & import("../../../../engine/core/Component").Component);
  });

  it("should detect scoring for Player 1", () => {
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Ball" } as import("../../../../engine/core/Component").Component);
    world.addComponent(ball, { type: "Transform", x: PONG_CONFIG.WIDTH + 10, y: 100 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: 100, dy: 0 } as VelocityComponent);

    system.update(world, 16);

    const state = world.getComponent<PongState & import("../../../../engine/core/Component").Component>(stateEntity, "PongState")!;
    expect(state.scoreP1).toBe(1);
    expect(state.scoreP2).toBe(0);
  });

  it("should detect scoring for Player 2", () => {
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Ball" } as import("../../../../engine/core/Component").Component);
    world.addComponent(ball, { type: "Transform", x: -10, y: 100 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: -100, dy: 0 } as VelocityComponent);

    system.update(world, 16);

    const state = world.getComponent<PongState & import("../../../../engine/core/Component").Component>(stateEntity, "PongState")!;
    expect(state.scoreP1).toBe(0);
    expect(state.scoreP2).toBe(1);
  });

  it("should detect win condition", () => {
    const state = world.getComponent<PongState & import("../../../../engine/core/Component").Component>(stateEntity, "PongState")!;
    state.scoreP1 = PONG_CONFIG.WIN_SCORE - 1;

    const ball = world.createEntity();
    world.addComponent(ball, { type: "Ball" } as import("../../../../engine/core/Component").Component);
    world.addComponent(ball, { type: "Transform", x: PONG_CONFIG.WIDTH + 10, y: 100 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: 100, dy: 0 } as VelocityComponent);

    system.update(world, 16);

    expect(state.scoreP1).toBe(PONG_CONFIG.WIN_SCORE);
    expect(state.isGameOver).toBe(true);
    expect(state.winner).toBe(1);
  });
});

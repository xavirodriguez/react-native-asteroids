import { createTestWorld } from "../../../../engine/test-utils/createTestWorld";
import { PongGameStateSystem } from "../PongGameStateSystem";
import { PongState, PONG_CONFIG, BallComponent } from "../../types";
import { TransformComponent, VelocityComponent } from "../../../../engine/types/EngineTypes";

describe("PongGameStateSystem", () => {
  let world: World;
  let system: PongGameStateSystem;
  let stateEntity: number;

  beforeEach(() => {
    world = createTestWorld({ resources: { GameConfig: PONG_CONFIG } });
    system = new PongGameStateSystem();
    stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "PongState",
      scoreP1: 0,
      scoreP2: 0,
      isGameOver: false,
      comboMultiplier: 1,
      gameOverLogged: false
    } as PongState);
  });

  it("should detect scoring for Player 1", () => {
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Ball", spinFactor: 0, spinDecay: 0.02 } as BallComponent);
    world.addComponent(ball, { type: "Transform", x: PONG_CONFIG.WIDTH + PONG_CONFIG.BALL_SIZE + 1, y: 100 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: 100, dy: 0 } as VelocityComponent);

    system.update(world, 16);

    const state = world.getComponent<PongState>(stateEntity, "PongState")!;
    expect(state.scoreP1).toBe(1);
    expect(state.scoreP2).toBe(0);
  });

  it("should detect scoring for Player 2", () => {
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Ball", spinFactor: 0, spinDecay: 0.02 } as BallComponent);
    world.addComponent(ball, { type: "Transform", x: -PONG_CONFIG.BALL_SIZE - 1, y: 100 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: -100, dy: 0 } as VelocityComponent);

    system.update(world, 16);

    const state = world.getComponent<PongState>(stateEntity, "PongState")!;
    expect(state.scoreP1).toBe(0);
    expect(state.scoreP2).toBe(1);
  });

  it("should detect win condition", () => {
    const state = world.getComponent<PongState>(stateEntity, "PongState")!;
    state.scoreP1 = PONG_CONFIG.WIN_SCORE - 1;

    const ball = world.createEntity();
    world.addComponent(ball, { type: "Ball", spinFactor: 0, spinDecay: 0.02 } as BallComponent);
    world.addComponent(ball, { type: "Transform", x: PONG_CONFIG.WIDTH + PONG_CONFIG.BALL_SIZE + 1, y: 100 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: 100, dy: 0 } as VelocityComponent);

    system.update(world, 16);

    expect(state.scoreP1).toBe(PONG_CONFIG.WIN_SCORE);
    expect(state.isGameOver).toBe(true);
    expect(state.winner).toBe(1);
  });
});

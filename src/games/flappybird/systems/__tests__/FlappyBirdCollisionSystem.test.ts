import { createTestWorld } from "../../../../engine/test-utils/createTestWorld";
import { CollisionSystem2D } from "../../../../engine/physics/collision/CollisionSystem2D";
import { FlappyBirdCollisionSystem } from "../FlappyBirdCollisionSystem";
import { createBird, createPipe, createGameState } from "../../EntityFactory";
import { FlappyBirdState, FLAPPY_CONFIG } from "../../types/FlappyBirdTypes";
import { IFlappyBirdGame } from "../../types/GameInterfaces";

describe("FlappyBirdCollisionSystem", () => {
  let world: World;
  let physicsSystem: CollisionSystem2D;
  let system: FlappyBirdCollisionSystem;
  let mockGame: IFlappyBirdGame;

  beforeEach(() => {
    world = createTestWorld({ resources: { GameConfig: FLAPPY_CONFIG } });
    physicsSystem = new CollisionSystem2D();
    mockGame = {
      getWorld: () => world,
      pause: jest.fn(),
    } as unknown as IFlappyBirdGame;
    system = new FlappyBirdCollisionSystem(mockGame);
  });

  it("should trigger game over when bird hits top pipe", () => {
    createGameState(world);
    createBird({ world, x: 100, y: 100 });
    createPipe({ world, x: 100, gapY: 300 });

    physicsSystem.update(world, 16.6);
    world.flush();
    physicsSystem.update(world, 16.6);
    world.flush();

    system.update(world, 16.6);
    world.flush();

    const gameState = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(gameState.isGameOver).toBe(true);
  });

  it("should not trigger game over when bird is in the gap", () => {
    createGameState(world);
    createBird({ world, x: 100, y: 300 });
    createPipe({ world, x: 100, gapY: 300 });

    physicsSystem.update(world, 16.6);
    world.flush();
    physicsSystem.update(world, 16.6);
    world.flush();

    system.update(world, 16.6);
    world.flush();

    const gameState = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(gameState.isGameOver).toBe(false);
  });

  it("should trigger game over when bird hits bottom pipe", () => {
    createGameState(world);
    createBird({ world, x: 100, y: 400 });
    createPipe({ world, x: 100, gapY: 300 });

    physicsSystem.update(world, 16.6);
    world.flush();
    physicsSystem.update(world, 16.6);
    world.flush();

    system.update(world, 16.6);
    world.flush();

    const gameState = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(gameState.isGameOver).toBe(true);
  });
});

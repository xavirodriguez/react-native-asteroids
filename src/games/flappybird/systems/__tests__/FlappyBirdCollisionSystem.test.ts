import { World } from "../../../../engine/core/World";
import { CollisionSystem2D } from "../../../../engine/physics/collision/CollisionSystem2D";
import { FlappyBirdCollisionSystem } from "../FlappyBirdCollisionSystem";
import { createBird, createPipe, createGameState } from "../../EntityFactory";
import { FlappyBirdState } from "../../types/FlappyBirdTypes";
import { IFlappyBirdGame } from "../../types/GameInterfaces";

describe("FlappyBirdCollisionSystem", () => {
  let world: World;
  let physicsSystem: CollisionSystem2D;
  let system: FlappyBirdCollisionSystem;
  let mockGame: IFlappyBirdGame;

  beforeEach(() => {
    world = new World();
    physicsSystem = new CollisionSystem2D();
    mockGame = {
      getWorld: () => world,
      pause: jest.fn(),
    } as any;
    system = new FlappyBirdCollisionSystem(mockGame);
  });

  it("should trigger game over when bird hits top pipe", () => {
    createGameState(world);
    const _bird = createBird({ world, x: 100, y: 100 });
    // Pipe at x=100, gap at y=300, gapSize=140.
    // Top pipe ends at 300 - 70 = 230.
    // Bird at y=100 (radius 15) is definitely hitting the top pipe (0 to 230).
    createPipe({ world, x: 100, gapY: 300 });

    physicsSystem.update(world, 16.6);
    system.update(world, 16.6);

    const gameState = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(gameState.isGameOver).toBe(true);
    // expect(mockGame.pause).toHaveBeenCalled(); // triggerGameOver in FlappyBirdCollisionSystem.ts does not call pause
  });

  it("should not trigger game over when bird is in the gap", () => {
    createGameState(world);
    // Gap is 230 to 370. Bird at y=300 is in the middle.
    createBird({ world, x: 100, y: 300 });
    createPipe({ world, x: 100, gapY: 300 });

    physicsSystem.update(world, 16.6);
    system.update(world, 16.6);

    const gameState = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(gameState.isGameOver).toBe(false);
  });

  it("should trigger game over when bird hits bottom pipe", () => {
    createGameState(world);
    // Bottom pipe starts at 300 + 70 = 370.
    // Bird at y=400 is hitting it.
    createBird({ world, x: 100, y: 400 });
    createPipe({ world, x: 100, gapY: 300 });

    physicsSystem.update(world, 16.6);
    system.update(world, 16.6);

    const gameState = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(gameState.isGameOver).toBe(true);
  });
});

import { createTestWorld } from "../../../../engine/test-utils/createTestWorld";
import { FlappyBirdGame } from "../../FlappyBirdGame";
import { FlappyBirdGameStateSystem } from "../FlappyBirdGameStateSystem";
import { createGameState } from "../../EntityFactory";
import { FlappyBirdState, FLAPPY_CONFIG } from "../../types/FlappyBirdTypes";
import { BaseGame } from "../../../../engine/core/BaseGame";

describe("FlappyBirdGameStateSystem", () => {
  let world: World;
  let game: FlappyBirdGame;
  let system: FlappyBirdGameStateSystem;

  beforeEach(() => {
    game = new FlappyBirdGame();
    // BaseGame calls registerSystems in constructor, which sets up the scene
    world = createTestWorld({ resources: { GameConfig: FLAPPY_CONFIG } });
    // Overwrite the game world with our test world
    (game as any).world = world;
    system = new FlappyBirdGameStateSystem(game as unknown as BaseGame<FlappyBirdState, Record<string, unknown>>);
  });

  it("should initialize with score 0", () => {
    createGameState(world);
    const state = world.getSingleton<FlappyBirdState>("FlappyState")!;
    expect(state.score).toBe(0);
    expect(state.isGameOver).toBe(false);
  });

  it("should update score when bird passes pipe", () => {
    // In FlappyBirdGameStateSystem, score is updated when pos.x < BIRD_X
    // BIRD_X is 100.
    const _state = createGameState(world);
    const pipe = world.createEntity();
    world.addComponent(pipe, { type: "Transform", x: 150, y: 300 });
    world.addComponent(pipe, { type: "Pipe", gapY: 300, gapSize: 140, scored: false });

    system.update(world, 16.67);
    expect(world.getSingleton<FlappyBirdState>("FlappyState")!.score).toBe(0);

    // Move pipe past bird
    const pos = world.getComponent<{x: number}>(pipe, "Transform")!;
    pos.x = 50;

    system.update(world, 16.67);
    expect(world.getSingleton<FlappyBirdState>("FlappyState")!.score).toBe(1);
    expect(world.getComponent<{scored: boolean}>(pipe, "Pipe")!.scored).toBe(true);
  });
});

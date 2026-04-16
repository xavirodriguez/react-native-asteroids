import { World } from "../../../../engine/core/World";
import { FlappyBirdGame } from "../../FlappyBirdGame";
import { FlappyBirdGameStateSystem } from "../FlappyBirdGameStateSystem";
import { createGameState } from "../../EntityFactory";
import { FlappyBirdState } from "../../types/FlappyBirdTypes";

describe("FlappyBirdGameStateSystem", () => {
  let world: World;
  let game: FlappyBirdGame;
  let system: FlappyBirdGameStateSystem;

  beforeEach(() => {
    game = new FlappyBirdGame();
    // BaseGame calls registerSystems in constructor, which sets up the scene
    world = game.getWorld();
    system = new FlappyBirdGameStateSystem(game as any);
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
    world.addComponent(pipe, { type: "Transform", x: 150, y: 300, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../../../engine/core/CoreComponents").TransformComponent);
    world.addComponent(pipe, { type: "Pipe", gapY: 300, gapSize: 140, scored: false } as import("../../types/FlappyBirdTypes").PipeComponent);

    system.update(world, 16.67);
    expect(world.getSingleton<FlappyBirdState>("FlappyState")!.score).toBe(0);

    // Move pipe past bird
    const pos = world.getComponent<import("../../../../engine/core/CoreComponents").TransformComponent>(pipe, "Transform")!;
    pos.x = 50;

    system.update(world, 16.67);
    expect(world.getSingleton<FlappyBirdState>("FlappyState")!.score).toBe(1);
    expect(world.getComponent<import("../../types/FlappyBirdTypes").PipeComponent>(pipe, "Pipe")!.scored).toBe(true);
  });
});

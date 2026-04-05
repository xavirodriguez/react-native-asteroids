import { World } from "../../../../engine/core/World";
import { SpaceInvadersGame, NullSpaceInvadersGame } from "../../SpaceInvadersGame";
import { SpaceInvadersGameStateSystem } from "../SpaceInvadersGameStateSystem";
import { createGameState } from "../../EntityFactory";
import { getGameState } from "../../GameUtils";

describe("SpaceInvadersGameStateSystem", () => {
  let world: World;
  let game: SpaceInvadersGame;
  let system: SpaceInvadersGameStateSystem;

  beforeEach(async () => {
    game = new SpaceInvadersGame();
    // SpaceInvadersGame uses SceneManager, but we need to ensure the scene is initialized for world access
    // Wait for the transition to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    const scene = game.sceneManager.getCurrentScene();
    if (scene) {
      await scene.onEnter();
    }
    world = game.getWorld();
    system = new SpaceInvadersGameStateSystem(game);
  });

  it("should initialize with level 1", () => {
    const state = getGameState(world);
    expect(state.level).toBe(1);
    expect(state.isGameOver).toBe(false);
  });

  it("should increment level when no invaders remain", () => {
    // Initial state has 0 invaders (system will spawn wave on first update if count is 0)
    system.update(world, 16.67);

    expect(world.query("Invader").length).toBeGreaterThan(0);
    const newState = getGameState(world);
    expect(newState.invadersRemaining).toBeGreaterThan(0);

    // Remove all invaders manually
    const invaders = world.query("Invader");
    invaders.forEach(e => world.removeEntity(e));

    system.update(world, 16.67);

    const leveledUpState = getGameState(world);
    expect(leveledUpState.level).toBe(2);
    expect(world.query("Invader").length).toBeGreaterThan(0);
  });

  it("should detect game over when lives reach 0", () => {
    const state = getGameState(world);
    state.lives = 0;

    system.update(world, 16);

    expect(system.isGameOver()).toBe(true);
  });
});

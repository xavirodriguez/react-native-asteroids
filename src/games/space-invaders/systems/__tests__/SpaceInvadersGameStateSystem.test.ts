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

  it("should increment level when no invaders remain", async () => {
    // Manually set up world for test
    const gameStateEntity = createGameState(world);

    // System updates level if invadersRemaining is 0
    // INITIAL_GAME_STATE has level 0, invadersRemaining 0.
    // createGameState sets level 1, invadersRemaining 0.

    // First update: invadersRemaining is 0, so it increments level to 2 and spawns wave
    system.update(world, 16.67);
    const state1 = world.getComponent<any>(gameStateEntity, "GameState");
    expect(state1.level).toBe(2);
    const invaders = world.query("Invader");
    expect(invaders.length).toBeGreaterThan(0);

    // Second update: invadersRemaining updated to count
    system.update(world, 16.67);
    expect(state1.invadersRemaining).toBe(invaders.length);

    // Remove all invaders manually
    invaders.forEach(e => world.removeEntity(e));

    // Third update: invadersRemaining is 0, so it increments level to 3 and spawns wave
    system.update(world, 16.67);

    const leveledUpState = world.getComponent<any>(gameStateEntity, "GameState");
    expect(leveledUpState.level).toBe(3);
    expect(world.query("Invader").length).toBeGreaterThan(0);
  });

  it("should detect game over when lives reach 0", () => {
    const gameStateEntity = createGameState(world);
    const state = world.getComponent<any>(gameStateEntity, "GameState");
    state.lives = 0;

    system.update(world, 16);

    // Manually point game to this world if needed, or just test system logic
    // system.isGameOver() calls game.getWorld()
    jest.spyOn(game, 'getWorld').mockReturnValue(world);

    expect(system.isGameOver()).toBe(true);
  });
});

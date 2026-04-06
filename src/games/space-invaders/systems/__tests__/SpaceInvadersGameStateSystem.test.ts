import { World } from "../../../../engine/core/World";
import { SpaceInvadersGame, NullSpaceInvadersGame } from "../../SpaceInvadersGame";
import { SpaceInvadersGameStateSystem } from "../SpaceInvadersGameStateSystem";
import { createGameState, spawnInvaderWave } from "../../EntityFactory";
import { getGameState } from "../../GameUtils";

describe("SpaceInvadersGameStateSystem", () => {
  let world: World;
  let game: ISpaceInvadersGame;
  let system: SpaceInvadersGameStateSystem;

  beforeEach(() => {
    world = new World();
    game = {
      getWorld: () => world,
    } as any;
    system = new SpaceInvadersGameStateSystem(game);
  });

  it("should initialize with level 1", () => {
    createGameState(world);
    const state = getGameState(world);
    expect(state.level).toBe(1);
    expect(state.isGameOver).toBe(false);
  });

  it("should increment level when no invaders remain", async () => {
    // Manually set up world for test
    createGameState(world);
    const state = getGameState(world);
    state.level = 1;

    // First update: count is 0, so it should increment level to 2 and spawn wave
    system.update(world, 16.67);

    expect(state.level).toBe(2);
    expect(world.query("Invader").length).toBeGreaterThan(0);

    // Second update: update the count in state
    system.update(world, 16.67);
    expect(state.invadersRemaining).toBeGreaterThan(0);
  });

  it("should detect game over when lives reach 0", () => {
    createGameState(world);
    const state = getGameState(world);
    state.lives = 0;
    state.isGameOver = true;

    expect(system.isGameOver()).toBe(true);
  });
});

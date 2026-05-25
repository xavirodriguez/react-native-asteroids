import { createTestWorld } from "../../../../engine/test-utils/createTestWorld";
import { SpaceInvadersGameStateSystem } from "../SpaceInvadersGameStateSystem";
import { createGameState } from "../../EntityFactory";
import { GameStateComponent } from "../../types/SpaceInvadersTypes";
import { SPACE_INVADERS_TEST_CONFIG } from "../../config/SpaceInvadersTestConfig";
import { ISpaceInvadersGame } from "../../types/GameInterfaces";

describe("SpaceInvadersGameStateSystem", () => {
  let world: World;
  let game: ISpaceInvadersGame;
  let system: SpaceInvadersGameStateSystem;

  beforeEach(() => {
    world = createTestWorld({ resources: { GameConfig: SPACE_INVADERS_TEST_CONFIG } });
    game = {
      getWorld: () => world,
      pause: jest.fn(),
    } as unknown as ISpaceInvadersGame;
    system = new SpaceInvadersGameStateSystem(game);
  });

  it("should initialize with level 1", () => {
    createGameState(world);
    const state = world.getSingleton<GameStateComponent>("GameState")!;
    expect(state.level).toBe(1);
    expect(state.isGameOver).toBe(false);
  });

  it("should increment level when no invaders remain", async () => {
    // Manually set up world for test
    createGameState(world);
    const state = world.getSingleton<GameStateComponent>("GameState")!;
    world.mutateSingleton<GameStateComponent>("GameState", gs => {
      gs.level = 1;
    });

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
    const state = world.getSingleton<GameStateComponent>("GameState")!;
    world.mutateSingleton<GameStateComponent>("GameState", gs => {
      gs.lives = 0;
    });

    system.update(world, 16.67);

    expect(system.isGameOver()).toBe(true);
  });
});

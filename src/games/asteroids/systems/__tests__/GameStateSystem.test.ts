import { World } from "../../../../engine/core/World";
import { GameStateSystem } from "../GameStateSystem";
import { HealthComponent, GameStateComponent } from "../../../../types/GameTypes";
import { getGameState } from "../../GameUtils";

describe("GameStateSystem", () => {
  let world: World;
  let system: GameStateSystem;

  beforeEach(() => {
    world = new World();
    system = new GameStateSystem();
    world.addSystem(system);
  });

  it("should decrement invulnerability and synchronize lives", () => {
    const ship = world.createEntity();
    world.addComponent(ship, { type: "Ship" });
    world.addComponent(ship, { type: "Health", current: 2, max: 3, invulnerableRemaining: 1000 });
    world.addComponent(ship, { type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false });

    const state = world.createEntity();
    world.addComponent(state, {
        type: "GameState",
        lives: 3,
        score: 0,
        level: 1,
        asteroidsRemaining: 0,
        isGameOver: false
    });

    world.update(100);

    const health = world.getComponent<HealthComponent>(ship, "Health");
    expect(health?.invulnerableRemaining).toBe(900);

    const gameState = world.getComponent<GameStateComponent>(state, "GameState");
    expect(gameState?.lives).toBe(2);
  });

  it("should advance level and spawn new wave when no asteroids remain", () => {
    const state = world.createEntity();
    const stateComp: GameStateComponent = {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      asteroidsRemaining: 0,
      isGameOver: false,
    };
    world.addComponent(state, stateComp);

    // Ensure stateComp is returned by getGameState
    // world.query("GameState") will find 'state'

    // We need to simulate the ship existence so updatePlayerStatus doesn't return early
    const ship = world.createEntity();
    world.addComponent(ship, { type: "Ship" });
    world.addComponent(ship, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });
    world.addComponent(ship, { type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false });

    // Should spawn initialCount + level = 4 + 1 = 5 asteroids
    // Then increment level to 2.
    world.update(0);

    // Re-fetch to be sure
    const gameState = getGameState(world);

    // After reordering:
    // updatePlayerStatus (ship found, lives sync to 3)
    // updateAsteroidsCount (0 asteroids)
    // manageWaveProgression (0 asteroids -> spawn wave of 5, level++ to 2)
    // updateGameOverStatus (lives=3 -> no game over)

    expect(gameState.level).toBe(2);
    expect(world.query("Asteroid").length).toBe(5);

    // One more update to sync asteroidsRemaining count if it's done at the END of the method
    // In current code:
    // this.updateAsteroidsCount(world, gameState); // Counted BEFORE spawn
    // this.manageWaveProgression(world, gameState); // Spawns
    // So we need another update or call it twice.
    world.update(0);

    expect(gameState.asteroidsRemaining).toBe(5);
    expect(world.query("Asteroid").length).toBe(5);
  });

  it("should trigger game over when player health reaches zero", () => {
    const ship = world.createEntity();
    world.addComponent(ship, { type: "Ship" });
    world.addComponent(ship, { type: "Health", current: 0, max: 3, invulnerableRemaining: 0 });
    world.addComponent(ship, { type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false });

    const state = world.createEntity();
    world.addComponent(state, {
      type: "GameState",
      lives: 1,
      score: 100,
      level: 1,
      asteroidsRemaining: 1,
      isGameOver: false,
    });

    world.update(0);

    const gameState = world.getComponent<GameStateComponent>(state, "GameState");
    expect(gameState?.isGameOver).toBe(true);
  });

  it("should NOT trigger game over when player ship is missing but lives > 0", () => {
    const state = world.createEntity();
    world.addComponent(state, {
      type: "GameState",
      lives: 3,
      score: 100,
      level: 1,
      asteroidsRemaining: 1,
      isGameOver: false,
    });

    world.update(0);

    const gameState = world.getComponent<GameStateComponent>(state, "GameState");
    expect(gameState?.isGameOver).toBe(false);
  });

  it("should trigger game over when lives reach zero", () => {
    const state = world.createEntity();
    world.addComponent(state, {
      type: "GameState",
      lives: 0,
      score: 100,
      level: 1,
      asteroidsRemaining: 1,
      isGameOver: false,
    });

    world.update(0);

    const gameState = world.getComponent<GameStateComponent>(state, "GameState");
    expect(gameState?.isGameOver).toBe(true);
  });
});

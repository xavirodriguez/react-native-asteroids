import { World } from "../../../../engine/World";
import { AsteroidGameStateSystem } from "../AsteroidGameStateSystem";
import { createGameState, createAsteroid, createShip } from "../../EntityFactory";
import { HealthComponent } from "../../../../engine/EngineTypes";
import { type GameStateComponent } from "../../types/AsteroidTypes";

describe("AsteroidGameStateSystem", () => {
  let world: World;
  let system: AsteroidGameStateSystem;

  beforeEach(() => {
    world = new World();
    system = new AsteroidGameStateSystem();
    createGameState({ world });
    world.addSystem(system);
  });

  it("should update asteroid count correctly", () => {
    const gameState = world.getSingleton<GameStateComponent>("GameState")!;
    expect(gameState.asteroidsRemaining).toBe(0);

    createAsteroid({ world, x: 100, y: 100, size: "large" });
    createAsteroid({ world, x: 200, y: 200, size: "medium" });

    system.update(world, 16.6);

    expect(gameState.asteroidsRemaining).toBe(2);
  });

  it("should advance level and spawn asteroids when all are destroyed", () => {
    const gameState = world.getSingleton<GameStateComponent>("GameState")!;
    gameState.level = 1;

    // Ensure world is empty of asteroids
    expect(world.query("Asteroid").length).toBe(0);

    // First update detects 0 asteroids, spawns wave, increments level
    system.update(world, 16.6);

    expect(gameState.level).toBe(2);
    // The world should have new asteroids now
    expect(world.query("Asteroid").length).toBeGreaterThan(0);

    // Second update should update the component count
    system.update(world, 16.6);
    expect(gameState.asteroidsRemaining).toBeGreaterThan(0);
  });

  it("should trigger game over when player loses all lives", () => {
    const gameState = world.getSingleton<GameStateComponent>("GameState")!;
    const ship = createShip({ world, x: 400, y: 300 });
    const health = world.getComponent<HealthComponent>(ship, "Health")!;

    health.current = 1;
    system.update(world, 16.6);
    expect(gameState.isGameOver).toBe(false);

    health.current = 0;
    system.update(world, 16.6);

    expect(gameState.isGameOver).toBe(true);
    expect(system.isGameOver(world)).toBe(true);
  });

  it("should reset game over state when requested", () => {
    const gameState = world.getSingleton<GameStateComponent>("GameState")!;
    const ship = createShip({ world, x: 400, y: 300 });
    const health = world.getComponent<HealthComponent>(ship, "Health")!;

    health.current = 0;
    system.update(world, 16.6);
    expect(gameState.isGameOver).toBe(true);
    expect(system.isGameOver(world)).toBe(true);

    system.resetGameOverState(world);
    expect(system.isGameOver(world)).toBe(false);
  });
});

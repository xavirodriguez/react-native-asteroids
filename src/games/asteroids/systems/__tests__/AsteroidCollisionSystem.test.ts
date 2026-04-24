import { World } from "../../../../engine/World";
import { CollisionSystem2D } from "../../../../engine/physics2d/CollisionSystem2D";
import { AsteroidCollisionSystem } from "../AsteroidCollisionSystem";
import { ParticlePool } from "../../EntityPool";
import { createAsteroid, createShip, createBullet, createGameState } from "../../EntityFactory";
import { GAME_CONFIG, type GameStateComponent } from "../../types/AsteroidTypes";

describe("AsteroidCollisionSystem", () => {
  let world: World;
  let physicsSystem: CollisionSystem2D;
  let particlePool: ParticlePool;
  let system: AsteroidCollisionSystem;

  beforeEach(() => {
    world = new World();
    physicsSystem = new CollisionSystem2D();
    particlePool = new ParticlePool();
    system = new AsteroidCollisionSystem(particlePool);
    createGameState({ world });
  });

  it("should increase score and destroy both bullet and asteroid on collision", () => {
    const _asteroid = createAsteroid({ world, x: 100, y: 100, size: "small" });
    const bullet = createBullet({ world, x: 100, y: 100, angle: 0 });

    const initialScore = world.getSingleton<GameStateComponent>("GameState")!.score;

    physicsSystem.update(world, 16.66);
    system.update(world, 16.66);

    expect(world.getAllEntities()).not.toContain(_asteroid);
    expect(world.getAllEntities()).not.toContain(bullet);
    expect(world.getSingleton<GameStateComponent>("GameState")!.score).toBe(initialScore + GAME_CONFIG.ASTEROID_SCORE);
  });

  it("should split a large asteroid into two medium ones on bullet collision", () => {
    const _asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });
    createBullet({ world, x: 100, y: 100, angle: 0 });

    physicsSystem.update(world, 16.66);
    system.update(world, 16.66);

    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBe(2);

    const sizeMap = asteroids.map(id => (world.getComponent<import("../../types/AsteroidTypes").AsteroidComponent>(id, "Asteroid")!).size);
    expect(sizeMap).toContain("medium");
    expect(sizeMap.filter(s => s === "medium").length).toBe(2);
  });

  it("should decrease ship health on asteroid collision", () => {
    const ship = createShip({ world, x: 100, y: 100 });
    // Reset invulnerability for testing
    const h = world.getComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health")!;
    h.invulnerableRemaining = 0;

    createAsteroid({ world, x: 100, y: 100, size: "small" });

    const initialHealth = h.current;

    physicsSystem.update(world, 16.66);
    system.update(world, 16.66);

    expect(h.current).toBe(initialHealth - 1);
    expect(h.invulnerableRemaining).toBeGreaterThan(0);
  });

  it("should not decrease health if ship is invulnerable", () => {
    const ship = createShip({ world, x: 100, y: 100 });
    const health = world.getComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health")!;
    health.invulnerableRemaining = 1000;
    const initialHealth = health.current;

    createAsteroid({ world, x: 100, y: 100, size: "small" });

    physicsSystem.update(world, 16.66);
    system.update(world, 16.66);

    expect(health.current).toBe(initialHealth);
  });
});

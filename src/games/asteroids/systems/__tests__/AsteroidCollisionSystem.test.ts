import { World } from "../../../../engine/core/World";
import { AsteroidCollisionSystem } from "../AsteroidCollisionSystem";
import { ParticlePool } from "../../EntityPool";
import { createAsteroid, createShip, createBullet, createGameState } from "../../EntityFactory";
import { BulletPool } from "../../EntityPool";
import { GAME_CONFIG, type GameStateComponent } from "../../types/AsteroidTypes";

describe("AsteroidCollisionSystem", () => {
  let world: World;
  let particlePool: ParticlePool;
  let bulletPool: BulletPool;
  let system: AsteroidCollisionSystem;

  beforeEach(() => {
    world = new World();
    particlePool = new ParticlePool();
    bulletPool = new BulletPool();
    system = new AsteroidCollisionSystem(particlePool);
    createGameState({ world });
  });

  it("should increase score and destroy both bullet and asteroid on collision", () => {
    const asteroid = createAsteroid({ world, x: 100, y: 100, size: "small" });
    const bullet = createBullet({ world, x: 100, y: 100, angle: 0, pool: bulletPool });

    const initialScore = world.getSingleton<GameStateComponent>("GameState")!.score;

    system.update(world, 16.66);

    expect(world.getAllEntities()).not.toContain(asteroid);
    expect(world.getAllEntities()).not.toContain(bullet);
    expect(world.getSingleton<GameStateComponent>("GameState")!.score).toBe(initialScore + GAME_CONFIG.ASTEROID_SCORE);
  });

  it("should split a large asteroid into two medium ones on bullet collision", () => {
    const asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });
    createBullet({ world, x: 100, y: 100, angle: 0, pool: bulletPool });

    system.update(world, 16.66);

    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBe(2);

    const sizeMap = asteroids.map(id => (world.getComponent<any>(id, "Asteroid") as any).size);
    expect(sizeMap).toContain("medium");
    expect(sizeMap.filter(s => s === "medium").length).toBe(2);
  });

  it("should decrease ship health on asteroid collision", () => {
    const ship = createShip({ world, x: 100, y: 100 });
    createAsteroid({ world, x: 100, y: 100, size: "small" });

    const health = world.getComponent<any>(ship, "Health") as any;
    const initialHealth = health.current;

    system.update(world, 16.66);

    expect(health.current).toBe(initialHealth - 1);
    expect(health.invulnerableRemaining).toBeGreaterThan(0);
  });

  it("should not decrease health if ship is invulnerable", () => {
    const ship = createShip({ world, x: 100, y: 100 });
    const health = world.getComponent<any>(ship, "Health") as any;
    health.invulnerableRemaining = 1000;
    const initialHealth = health.current;

    createAsteroid({ world, x: 100, y: 100, size: "small" });

    system.update(world, 16.66);

    expect(health.current).toBe(initialHealth);
  });
});

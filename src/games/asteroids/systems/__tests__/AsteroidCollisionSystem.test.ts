import { World } from "../../../../engine/core/World";
import { CollisionSystem2D } from "../../../../engine/physics/collision/CollisionSystem2D";
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
    world.setResource("GameConfig", GAME_CONFIG);
    physicsSystem = new CollisionSystem2D();
    particlePool = new ParticlePool();
    system = new AsteroidCollisionSystem(particlePool);
    createGameState({ world });
  });

  it("should increase score and destroy both bullet and asteroid on collision", () => {
    const _asteroid = createAsteroid({ world, x: 100, y: 100, size: "small" });
    const bullet = createBullet({ world, x: 100, y: 100, angle: 0 });

    const initialScore = world.getSingleton<GameStateComponent>("GameState")!.score;

    // Manually add CollisionEvents to ensure it exists for the test
    const asteroid = _asteroid;
    world.addComponent(bullet, { type: "CollisionEvents", collisions: [{ otherEntity: asteroid }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);
    world.addComponent(asteroid, { type: "CollisionEvents", collisions: [{ otherEntity: bullet }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);

    physicsSystem.update(world, 16.66);
    world.flush();

    system.update(world, 16.66);
    world.flush();

    expect(world.getAllEntities()).not.toContain(_asteroid);
    expect(world.getAllEntities()).not.toContain(bullet);
    expect(world.getSingleton<GameStateComponent>("GameState")!.score).toBe(initialScore + GAME_CONFIG.ASTEROID_SCORE);
  });

  it("should split a large asteroid into two medium ones on bullet collision", () => {
    const _asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });
    const bullet = createBullet({ world, x: 100, y: 100, angle: 0 });

    world.addComponent(bullet, { type: "CollisionEvents", collisions: [{ otherEntity: _asteroid }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);
    world.addComponent(_asteroid, { type: "CollisionEvents", collisions: [{ otherEntity: bullet }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);

    physicsSystem.update(world, 16.66);
    world.flush();

    system.update(world, 16.66);
    world.flush();

    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBe(2);

    const sizeMap = asteroids.map(id => (world.getComponent<import("../../types/AsteroidTypes").AsteroidComponent>(id, "Asteroid")!).size);
    expect(sizeMap).toContain("medium");
    expect(sizeMap.filter(s => s === "medium").length).toBe(2);
  });

  it("should decrease ship health on asteroid collision", () => {
    const ship = createShip({ world, x: 100, y: 100 });
    // Reset invulnerability for testing
    world.mutateComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health", h => {
        h.invulnerableRemaining = 0;
    });

    const _asteroid = createAsteroid({ world, x: 100, y: 100, size: "small" });

    world.addComponent(ship, { type: "CollisionEvents", collisions: [{ otherEntity: _asteroid }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);
    world.addComponent(_asteroid, { type: "CollisionEvents", collisions: [{ otherEntity: ship }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);

    physicsSystem.update(world, 16.66);
    world.flush();

    system.update(world, 16.66);
    world.flush();

    const h = world.getComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health")!;
    expect(h.current).toBe(2); // 3 - 1
    expect(h.invulnerableRemaining).toBeGreaterThan(0);
  });

  it("should not decrease health if ship is invulnerable", () => {
    const ship = createShip({ world, x: 100, y: 100 });
    world.mutateComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health", h => {
        h.invulnerableRemaining = 1000;
    });
    const initialHealth = world.getComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health")!.current;

    const _asteroid = createAsteroid({ world, x: 100, y: 100, size: "small" });

    world.addComponent(ship, { type: "CollisionEvents", collisions: [{ otherEntity: _asteroid }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);
    world.addComponent(_asteroid, { type: "CollisionEvents", collisions: [{ otherEntity: ship }], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);

    physicsSystem.update(world, 16.66);
    world.flush();

    system.update(world, 16.66);
    world.flush();

    const health = world.getComponent<import("../../types/AsteroidTypes").HealthComponent>(ship, "Health")!;
    expect(health.current).toBe(initialHealth);
  });
});

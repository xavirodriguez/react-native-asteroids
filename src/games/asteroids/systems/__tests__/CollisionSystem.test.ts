import { World } from "../../../../engine/core/World";
import { CollisionSystem } from "../../../../engine/systems/generic/CollisionSystem";
import { EventBus } from "../../../../engine/utils/EventBus";
import { AsteroidsCollisionResolver } from "../AsteroidsCollisionResolver";
import { GAME_CONFIG, type HealthComponent, type GameStateComponent } from "../../../../types/GameTypes";

describe("Collision System Integration", () => {
  let world: World;
  let eventBus: EventBus;
  let collisionSystem: CollisionSystem;
  let resolver: AsteroidsCollisionResolver;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    collisionSystem = new CollisionSystem(eventBus);
    resolver = new AsteroidsCollisionResolver(eventBus);
    world.addSystem(collisionSystem);
    world.addSystem(resolver);
  });

  afterEach(() => {
    resolver.destroy();
  });

  it("should detect collision between two circles and resolve via Asteroids resolver", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Ship" });
    world.addComponent(e1, { type: "Position", x: 100, y: 100 });
    world.addComponent(e1, { type: "Collider", radius: 10 });
    world.addComponent(e1, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });

    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Position", x: 115, y: 100 });
    world.addComponent(e2, { type: "Collider", radius: 10 });
    world.addComponent(e2, { type: "Asteroid", size: "large" });

    // Distance is 15. Sum of radii is 20. Should collide.
    world.update(0);

    const health = world.getComponent<HealthComponent>(e1, "Health");
    expect(health?.current).toBe(2);
    expect(health?.invulnerableRemaining).toBe(GAME_CONFIG.INVULNERABILITY_DURATION);
  });

  it("should respect invulnerability", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Ship" });
    world.addComponent(e1, { type: "Position", x: 100, y: 100 });
    world.addComponent(e1, { type: "Collider", radius: 10 });
    world.addComponent(e1, { type: "Health", current: 3, max: 3, invulnerableRemaining: 1000 });

    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Position", x: 105, y: 100 });
    world.addComponent(e2, { type: "Collider", radius: 10 });
    world.addComponent(e2, { type: "Asteroid", size: "large" });

    world.update(0);

    const health = world.getComponent<HealthComponent>(e1, "Health");
    expect(health?.current).toBe(3); // No health lost
  });

  it("should handle bullet-asteroid collision and update score", () => {
    // Setup GameState
    const gs = world.createEntity();
    world.addComponent(gs, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      asteroidsRemaining: 1,
      isGameOver: false,
    });

    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "Bullet" });
    world.addComponent(bullet, { type: "Position", x: 100, y: 100 });
    world.addComponent(bullet, { type: "Collider", radius: 2 });

    const asteroid = world.createEntity();
    world.addComponent(asteroid, { type: "Asteroid", size: "large" });
    world.addComponent(asteroid, { type: "Position", x: 100, y: 100 });
    world.addComponent(asteroid, { type: "Collider", radius: 30 });

    world.update(0);

    // Bullet should be removed
    expect(world.getComponent(bullet, "Bullet")).toBeUndefined();
    // Large asteroid should be removed and replaced by two medium ones
    expect(world.getComponent(asteroid, "Asteroid")).toBeUndefined();

    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBe(2);

    const gameState = world.getComponent<GameStateComponent>(gs, "GameState")!;
    expect(gameState.score).toBe(GAME_CONFIG.ASTEROID_SCORE);
  });
});

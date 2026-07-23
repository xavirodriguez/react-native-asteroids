import { World } from "../src/ecs/World";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../src/games/asteroids/types/AsteroidRegistry";
import { AsteroidCollisionSystem } from "../src/games/asteroids/systems/AsteroidCollisionSystem";
import { ParticlePool } from "../src/games/asteroids/EntityPool";
import { createBullet } from "../src/games/asteroids/EntityFactory";
import { EventBus } from "../src/events/EventBus";

describe("AsteroidCollisionSystem & Bullet Tests", () => {
  let world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  let particlePool: ParticlePool;
  let collisionSystem: AsteroidCollisionSystem;
  let eventBus: EventBus<AsteroidsEventRegistry>;

  beforeEach(() => {
    world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    eventBus = new EventBus<AsteroidsEventRegistry>();
    world.setResource("EventBus", eventBus);
    particlePool = new ParticlePool();
    collisionSystem = new AsteroidCollisionSystem();
    world.gameplayRandom.unlock(); // Unlock random for the test simulation

    // Setup GameState singleton
    const stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "GameState",
      score: 0,
      level: 1,
      lives: 3,
      isGameOver: false
    });
  });

  it("should create bullet using the factory with expected components", () => {
    const bullet = createBullet(world, 10, 20, Math.PI / 4, 300, "player-1", 3);

    expect(world.hasComponent(bullet, "Transform")).toBe(true);
    expect(world.hasComponent(bullet, "Velocity")).toBe(true);
    expect(world.hasComponent(bullet, "Render")).toBe(true);
    expect(world.hasComponent(bullet, "Bullet")).toBe(true);
    expect(world.hasComponent(bullet, "TTL")).toBe(true);

    const transform = world.getComponent(bullet, "Transform")!;
    expect(transform.x).toBe(10);
    expect(transform.y).toBe(20);
    expect(transform.rotation).toBeCloseTo(Math.PI / 4);

    const velocity = world.getComponent(bullet, "Velocity")!;
    expect(velocity.vx).toBeCloseTo(Math.cos(Math.PI / 4) * 300);
    expect(velocity.vy).toBeCloseTo(Math.sin(Math.PI / 4) * 300);

    const bulletComp = world.getComponent(bullet, "Bullet")!;
    expect(bulletComp.ownerId).toBe("player-1");

    const ttl = world.getComponent(bullet, "TTL") as any;
    expect(ttl.timeLeft).toBe(3);
    expect(ttl.remaining).toBe(3);
  });

  it("should resolve bullet-asteroid collision with double security and defer destruction", () => {
    const bullet = createBullet(world, 10, 10, 0, 100, "player-1");

    // Create an asteroid
    const asteroid = world.createEntity();
    world.addComponent(asteroid, { type: "Asteroid", size: "medium" });
    world.addComponent(asteroid, {
      type: "Transform",
      x: 10,
      y: 10,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 10,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    // Setup CollisionEvents on both
    world.addComponent(bullet, {
      type: "CollisionEvents",
      collisions: [{
        otherEntity: asteroid,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    world.addComponent(asteroid, {
      type: "CollisionEvents",
      collisions: [{
        otherEntity: bullet,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    const asteroidDestroyedSpy = jest.fn();
    const scoreChangedSpy = jest.fn();
    eventBus.on("asteroid:destroyed", asteroidDestroyedSpy);
    eventBus.on("score:changed", scoreChangedSpy);

    collisionSystem.update(world, 0.016);

    // Deferral: entities should not be removed in update, but must be in the command buffer
    expect(world.hasEntity(bullet)).toBe(true);
    expect(world.hasEntity(asteroid)).toBe(true);

    // Flush commands to apply removals
    world.flush();

    expect(world.hasEntity(bullet)).toBe(false);
    expect(world.hasEntity(asteroid)).toBe(false);

    // Verify event bus has NOT synchronously emitted, but has deferred them
    expect(asteroidDestroyedSpy).not.toHaveBeenCalled();
    expect(scoreChangedSpy).not.toHaveBeenCalled();

    // Flush deferred events
    eventBus.flushDeferred();

    expect(asteroidDestroyedSpy).toHaveBeenCalledWith({ entity: asteroid, size: "medium" }, "asteroid:destroyed");
    expect(scoreChangedSpy).toHaveBeenCalledWith({ newScore: 50, delta: 50 }, "score:changed");

    // GameState score should be updated
    const state = world.getSingleton("GameState")!;
    expect(state.score).toBe(50);
  });

  it("should resolve ship-asteroid collision and reduce lives", () => {
    const ship = world.createEntity();
    world.addComponent(ship, { type: "Ship", sessionId: "my-session" });
    world.addComponent(ship, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    const asteroid = world.createEntity();
    world.addComponent(asteroid, { type: "Asteroid", size: "large" });
    world.addComponent(asteroid, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    world.addComponent(ship, {
      type: "CollisionEvents",
      collisions: [{
        otherEntity: asteroid,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    world.addComponent(asteroid, {
      type: "CollisionEvents",
      collisions: [{
        otherEntity: ship,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    const shipDestroyedSpy = jest.fn();
    eventBus.on("ship:destroyed", shipDestroyedSpy);

    collisionSystem.update(world, 0.016);

    world.flush();
    // Since lives left (3 -> 2), ship should stay alive (be respawned in-place)
    expect(world.hasEntity(ship)).toBe(true);
    expect(world.hasEntity(asteroid)).toBe(true); // Asteroids are only destroyed by bullets, not ship collision

    eventBus.flushDeferred();
    expect(shipDestroyedSpy).toHaveBeenCalledWith({ entity: ship }, "ship:destroyed");

    const state = world.getSingleton("GameState")!;
    expect(state.lives).toBe(2);
    expect(state.isGameOver).toBe(false);
  });
});

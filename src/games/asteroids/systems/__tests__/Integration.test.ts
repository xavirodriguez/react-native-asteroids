import { World } from "../../../../engine/core/World";
import { CollisionSystem2D } from "../../../../engine/physics/collision/CollisionSystem2D";
import { AsteroidCollisionSystem } from "../AsteroidCollisionSystem";
import { AsteroidGameStateSystem } from "../AsteroidGameStateSystem";
import { MovementSystem } from "../../../../engine/systems/MovementSystem";
import { ParticlePool, BulletPool } from "../../EntityPool";
import { createBullet, createGameState } from "../../EntityFactory";
import { GAME_CONFIG, type GameStateComponent } from "../../types/AsteroidTypes";

describe("Asteroids Gameplay Integration", () => {
  let world: World;
  let physicsSystem: CollisionSystem2D;
  let particlePool: ParticlePool;
  let _bulletPool: BulletPool;
  let collisionSystem: AsteroidCollisionSystem;
  let gameStateSystem: AsteroidGameStateSystem;
  let _movementSystem: MovementSystem;

  beforeEach(() => {
    world = new World();
    physicsSystem = new CollisionSystem2D();
    particlePool = new ParticlePool();
    _bulletPool = new BulletPool();
    collisionSystem = new AsteroidCollisionSystem(particlePool);
    gameStateSystem = new AsteroidGameStateSystem();
    _movementSystem = new MovementSystem();

    const gameStateEntity = createGameState({ world });
    // Ensure asteroidsRemaining starts at 0 to trigger initial wave
    const gs = world.getComponent<import("../../types/AsteroidTypes").GameStateComponent>(gameStateEntity, "GameState")!;
    gs.asteroidsRemaining = 0;
    gs.level = 0; // It will increment to 1

    // AsteroidGameStateSystem will spawn a wave if it sees asteroidsRemaining is 0
    // But it updates asteroidsRemaining based on world.query("Asteroid")
    gameStateSystem.update(world, 16.66);
    // Call it twice: once to spawn (detecting 0), once to update count (detecting newly spawned)
    gameStateSystem.update(world, 16.66);
  });

  it("should verify that asteroids were spawned", () => {
    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBeGreaterThan(0);
    expect(world.getSingleton<GameStateComponent>("GameState")!.asteroidsRemaining).toBeGreaterThan(0);
  });

  it("should complete a full destruction cycle: spawn -> collision -> split -> score", () => {
    const gameState = world.getSingleton<GameStateComponent>("GameState")!;
    expect(gameState.asteroidsRemaining).toBeGreaterThan(0);
    const initialAsteroidCount = gameState.asteroidsRemaining;
    const initialScore = gameState.score;

    // 1. Find an asteroid and spawn a bullet on top of it
    const asteroids = world.query("Asteroid", "Transform");
    const targetAsteroid = asteroids[0];
    const pos = world.getComponent<import("../../../../engine/types/EngineTypes").TransformComponent>(targetAsteroid, "Transform")!;

    createBullet({
      world,
      x: pos.x,
      y: pos.y,
      angle: 0
    });

    // 2. Run collision systems
    physicsSystem.update(world, 16.66);
    collisionSystem.update(world, 16.66);

    // 3. Verify target asteroid is gone (or replaced by splits)
    expect(world.getAllEntities()).not.toContain(targetAsteroid);

    // 4. Update game state to recount asteroids
    gameStateSystem.update(world, 16.66);

    // 5. Check score increase
    expect(world.getSingleton<GameStateComponent>("GameState")!.score).toBe(initialScore + GAME_CONFIG.ASTEROID_SCORE);

    // 6. Check if it split (if it was large or medium)
    const newAsteroidCount = world.getSingleton<GameStateComponent>("GameState")!.asteroidsRemaining;
    // A split adds 2 and removes 1, so count should increase if it was large/medium
    expect(newAsteroidCount).toBeGreaterThan(initialAsteroidCount - 1);
  });

  it("should advance level when all asteroids are destroyed", () => {
    const gameState = world.getSingleton<GameStateComponent>("GameState")!;
    const initialLevel = gameState.level;

    // 1. Destroy all asteroids
    const asteroids = world.query("Asteroid");
    asteroids.forEach(a => world.removeEntity(a));

    // 2. Update game state system
    gameStateSystem.update(world, 16.66); // Recount (sets to 0)
    gameStateSystem.update(world, 16.66); // Advance and spawn

    // 3. Verify level advanced
    expect(world.getSingleton<GameStateComponent>("GameState")!.level).toBe(initialLevel + 1);

    gameStateSystem.update(world, 16.66); // Recount new ones
    // 4. Verify new asteroids spawned
    expect(world.getSingleton<GameStateComponent>("GameState")!.asteroidsRemaining).toBeGreaterThan(0);
  });

  it("should detect collisions between objects with very different radii (Sweep and Prune edge case)", () => {
    // 1. Create a large asteroid
    const largeAsteroid = world.createEntity();
    const largeRadius = 100;
    world.addComponent(largeAsteroid, { type: "Transform", x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 });
    world.addComponent(largeAsteroid, {
      type: "Collider2D",
      shape: { type: "circle", radius: largeRadius },
      layer: 4, // ENEMY
      mask: 8 | 2, // PROJECTILE | PLAYER
      offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(largeAsteroid, { type: "Asteroid", size: "large" });

    // 2. Create a small bullet that should collide with the large asteroid
    // The bullet is at x=110.
    // Large asteroid minX = 200 - 100 = 100.
    // Large asteroid maxX = 200 + 100 = 300.
    // Bullet is inside the X-range [100, 300].
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "Transform", x: 110, y: 200, rotation: 0, scaleX: 1, scaleY: 1 });
    world.addComponent(bullet, {
      type: "Collider2D",
      shape: { type: "circle", radius: 2 },
      layer: 8, // PROJECTILE
      mask: 4, // ENEMY
      offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(bullet, { type: "Bullet" });

    // 3. Create another object that is "in between" in minX but further in X to test 'break' logic
    const filler = world.createEntity();
    world.addComponent(filler, { type: "Transform", x: 105, y: 500, rotation: 0, scaleX: 1, scaleY: 1 }); // Far away in Y
    world.addComponent(filler, {
      type: "Collider2D",
      shape: { type: "circle", radius: 1 },
      layer: 1, mask: 1, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });

    const initialScore = world.getSingleton<GameStateComponent>("GameState")!.score;

    physicsSystem.update(world, 16.66);
    collisionSystem.update(world, 16.66);

    // If collision was detected, bullet and asteroid should be handled (destroyed/split)
    // and score should increase.
    expect(world.getAllEntities()).not.toContain(bullet);
    expect(world.getSingleton<GameStateComponent>("GameState")!.score).toBeGreaterThan(initialScore);
  });
});

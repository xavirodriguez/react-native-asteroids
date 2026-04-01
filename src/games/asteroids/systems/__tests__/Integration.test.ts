import { World } from "../../../../engine/core/World";
import { AsteroidCollisionSystem } from "../AsteroidCollisionSystem";
import { AsteroidGameStateSystem } from "../AsteroidGameStateSystem";
import { MovementSystem } from "../../../../engine/systems/MovementSystem";
import { ParticlePool, BulletPool } from "../../EntityPool";
import { createBullet, createGameState } from "../../EntityFactory";
import { getGameState } from "../../GameUtils";
import { GAME_CONFIG } from "../../types/AsteroidTypes";

describe("Asteroids Gameplay Integration", () => {
  let world: World;
  let particlePool: ParticlePool;
  let bulletPool: BulletPool;
  let collisionSystem: AsteroidCollisionSystem;
  let gameStateSystem: AsteroidGameStateSystem;
  let movementSystem: MovementSystem;

  beforeEach(() => {
    world = new World();
    particlePool = new ParticlePool();
    bulletPool = new BulletPool();
    collisionSystem = new AsteroidCollisionSystem(particlePool);
    gameStateSystem = new AsteroidGameStateSystem();
    movementSystem = new MovementSystem();

    const gameStateEntity = createGameState({ world });
    // Ensure asteroidsRemaining starts at 0 to trigger initial wave
    const gs = world.getComponent<any>(gameStateEntity, "GameState");
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
    expect(getGameState(world).asteroidsRemaining).toBeGreaterThan(0);
  });

  it("should complete a full destruction cycle: spawn -> collision -> split -> score", () => {
    const gameState = getGameState(world);
    expect(gameState.asteroidsRemaining).toBeGreaterThan(0);
    const initialAsteroidCount = gameState.asteroidsRemaining;
    const initialScore = gameState.score;

    // 1. Find an asteroid and spawn a bullet on top of it
    const asteroids = world.query("Asteroid", "Position");
    const targetAsteroid = asteroids[0];
    const pos = world.getComponent<any>(targetAsteroid, "Position");

    createBullet({
      world,
      x: pos.x,
      y: pos.y,
      angle: 0,
      pool: bulletPool
    });

    // 2. Run collision system
    collisionSystem.update(world, 16.66);

    // 3. Verify target asteroid is gone (or replaced by splits)
    expect(world.getAllEntities()).not.toContain(targetAsteroid);

    // 4. Update game state to recount asteroids
    gameStateSystem.update(world, 16.66);

    // 5. Check score increase
    expect(getGameState(world).score).toBe(initialScore + GAME_CONFIG.ASTEROID_SCORE);

    // 6. Check if it split (if it was large or medium)
    const newAsteroidCount = getGameState(world).asteroidsRemaining;
    // A split adds 2 and removes 1, so count should increase if it was large/medium
    expect(newAsteroidCount).toBeGreaterThan(initialAsteroidCount - 1);
  });

  it("should advance level when all asteroids are destroyed", () => {
    const gameState = getGameState(world);
    const initialLevel = gameState.level;

    // 1. Destroy all asteroids
    const asteroids = world.query("Asteroid");
    asteroids.forEach(a => world.removeEntity(a));

    // 2. Update game state system
    gameStateSystem.update(world, 16.66); // Recount (sets to 0)
    gameStateSystem.update(world, 16.66); // Advance and spawn

    // 3. Verify level advanced
    expect(getGameState(world).level).toBe(initialLevel + 1);

    gameStateSystem.update(world, 16.66); // Recount new ones
    // 4. Verify new asteroids spawned
    expect(getGameState(world).asteroidsRemaining).toBeGreaterThan(0);
  });

  it("should detect collisions between objects with very different radii (Sweep and Prune edge case)", () => {
    // 1. Create a large asteroid
    const largeAsteroid = world.createEntity();
    const largeRadius = 100;
    world.addComponent(largeAsteroid, { type: "Position", x: 200, y: 200 });
    world.addComponent(largeAsteroid, { type: "Collider", radius: largeRadius });
    world.addComponent(largeAsteroid, { type: "Asteroid", size: "large" });

    // 2. Create a small bullet that should collide with the large asteroid
    // The bullet is at x=110.
    // Large asteroid minX = 200 - 100 = 100.
    // Large asteroid maxX = 200 + 100 = 300.
    // Bullet is inside the X-range [100, 300].
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "Position", x: 110, y: 200 });
    world.addComponent(bullet, { type: "Collider", radius: 2 });
    world.addComponent(bullet, { type: "Bullet" });

    // 3. Create another object that is "in between" in minX but further in X to test 'break' logic
    // Object C: x=105, radius=1. minX=104.
    // Asteroid A: x=200, radius=100. minX=100. maxX=300.
    // Bullet B: x=110, radius=2. minX=108.
    // Sorted by minX: Asteroid A (100), Object C (104), Bullet B (108).
    // If we check A, its maxX=300.
    // C's minX (104) < 300.
    // B's minX (108) < 300.
    // If our logic is correct, it should not break at C and should reach B.
    const filler = world.createEntity();
    world.addComponent(filler, { type: "Position", x: 105, y: 500 }); // Far away in Y
    world.addComponent(filler, { type: "Collider", radius: 1 });

    const initialScore = getGameState(world).score;

    collisionSystem.update(world, 16.66);

    // If collision was detected, bullet and asteroid should be handled (destroyed/split)
    // and score should increase.
    expect(world.getAllEntities()).not.toContain(bullet);
    expect(getGameState(world).score).toBeGreaterThan(initialScore);
  });
});

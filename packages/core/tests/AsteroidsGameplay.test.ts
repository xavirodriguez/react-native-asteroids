import { World } from "../src/ecs/World";
import { AsteroidsGame } from "../src/games/asteroids/AsteroidsGame";
import { computeShipPhysics } from "../src/games/asteroids/utils/AsteroidPhysics";
import { createShip, createAsteroid, createBullet, fragmentAsteroid, spawnAsteroidWave } from "../src/games/asteroids/EntityFactory";
import { CollisionLayers } from "../src/games/shared/types/CollisionLayers";

describe("Asteroids Gameplay, Physics & Collision Systems", () => {
  let game: AsteroidsGame;
  let world: World<any, any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();
    world.gameplayRandom.unlock(); // Unlock for testing convenience

    // Clear all initially spawned entities to prevent collision flakiness in tests
    const initialAsteroids = world.query("Asteroid");
    for (const entity of initialAsteroids) {
      world.getCommandBuffer().removeEntity(entity);
    }
    const initialShips = world.query("Ship");
    for (const entity of initialShips) {
      world.getCommandBuffer().removeEntity(entity);
    }
    world.getCommandBuffer().flush(world); // Flush command buffer síncronamente sin bloquear gameplayRandom
  });

  afterEach(() => {
    game.destroy();
  });

  describe("computeShipPhysics", () => {
    it("should correctly rotate ship clockwise and counter-clockwise", () => {
      const transform = { rotation: 0 };
      const velocity = { vx: 0, vy: 0 };
      const config = { SHIP_THRUST: 150, SHIP_ROTATION_SPEED: 4.0, SHIP_FRICTION: 0.5 };

      // Rotate Right
      let result = computeShipPhysics(transform, velocity, { rotateRight: true }, config, 0.1);
      expect(result.rotation).toBeCloseTo(0.4, 4);

      // Rotate Left
      result = computeShipPhysics(transform, velocity, { rotateLeft: true }, config, 0.1);
      expect(result.rotation).toBeCloseTo(-0.4, 4);
    });

    it("should apply thrust based on ship rotation and handle friction", () => {
      const transform = { rotation: 0 }; // cos(0) = 1, sin(0) = 0
      const velocity = { vx: 0, vy: 0 };
      const config = { SHIP_THRUST: 100, SHIP_ROTATION_SPEED: 4.0, SHIP_FRICTION: 1.0 };

      // Apply thrust for 0.1 seconds
      let result = computeShipPhysics(transform, velocity, { thrust: true }, config, 0.1);
      // ax = cos(0)*100 = 100. vx_pre = ax*0.1 = 10. vx_post = 10 * (1 - 1.0*0.1) = 9
      expect(result.vx).toBeCloseTo(9, 4);
      expect(result.vy).toBe(0);
    });
  });

  describe("EntityFactory & Pools", () => {
    it("should create a ship with all required components", () => {
      const ship = createShip({ world, x: 100, y: 200 });
      expect(world.hasEntity(ship)).toBe(true);
      expect(world.getComponent(ship, "Transform")).toBeDefined();
      expect(world.getComponent(ship, "Velocity")).toBeDefined();
      expect(world.getComponent(ship, "Render")).toBeDefined();
      expect(world.getComponent(ship, "Health")).toBeDefined();
      expect(world.getComponent(ship, "Collider")).toBeDefined();
      expect(world.getComponent(ship, "CollisionEvents")).toBeDefined();
      expect(world.getComponent(ship, "Boundary")).toBeDefined();
    });

    it("should create a bullet with appropriate TTL and Collider components", () => {
      const bullet = createBullet({ world, x: 100, y: 200, vx: 50, vy: -50, ownerId: "player" });
      expect(world.hasEntity(bullet)).toBe(true);

      const ttl = world.getComponent(bullet, "TTL") as any;
      expect(ttl).toBeDefined();
      expect(ttl.remaining).toBe(2.0); // default BULLET_TTL from AsteroidConfigSchema is 2.0

      const collider = world.getComponent(bullet, "Collider") as any;
      expect(collider).toBeDefined();
      expect(collider.layer).toBe(CollisionLayers.PROJECTILE);
      expect(collider.mask).toBe(CollisionLayers.ENEMY);
    });

    it("should fragment a large asteroid into two medium asteroids deterministically", () => {
      const largeAsteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });

      // Trigger fragmentation
      fragmentAsteroid(world, largeAsteroid);

      // Verify two medium asteroids were created
      const asteroids = world.query("Asteroid");
      const mediumAsteroids = asteroids.filter(id => {
        const a = world.getComponent(id, "Asteroid") as any;
        return a.size === "medium";
      });

      expect(mediumAsteroids.length).toBe(2);
      // Clean up parent
      world.getCommandBuffer().removeEntity(largeAsteroid);
    });
  });

  describe("AsteroidCollisionSystem & Invulnerability", () => {
    it("should resolve bullet and asteroid collisions by destroying the bullet and splitting the asteroid", () => {
      const bullet = createBullet({ world, x: 100, y: 100, vx: 0, vy: 0 });
      const asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });

      // Simulate Collision event
      const eventsComp = world.getComponent(bullet, "CollisionEvents") as any;
      eventsComp.collisions.push({
        otherEntity: asteroid,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      });

      // Update world (runs collision and gameState systems)
      world.update(0.016);

      // Commands execution is deferred, verify they are requested for removal
      expect(world.hasEntity(bullet)).toBe(false);
      expect(world.hasEntity(asteroid)).toBe(false);

      // Verify score is updated
      const state = game.getGameState();
      expect(state.score).toBe(20); // 20 points for large asteroid
    });

    it("should ignore lethal ship-asteroid collisions if ship is invulnerable", () => {
      const ship = createShip({ world, x: 100, y: 100 });
      const asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });

      // Make ship invulnerable
      world.addComponent(ship, {
        type: "Invulnerable",
        remaining: 3.0
      } as any);

      // Add collision event to ship
      const eventsComp = world.getComponent(ship, "CollisionEvents") as any;
      eventsComp.collisions.push({
        otherEntity: asteroid,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      });

      // Update
      world.update(0.016);

      // Ship should NOT be destroyed and its lives should still be intact
      expect(world.hasEntity(ship)).toBe(true);
      const state = game.getGameState();
      expect(state.lives).toBe(3); // lives remain 3
    });

    it("should decrement life and respawn ship when hit by asteroid without invulnerability", () => {
      const ship = createShip({ world, x: 100, y: 100 });
      const asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });

      // Verify ship is NOT invulnerable initially
      expect(world.hasComponent(ship, "Invulnerable" as any)).toBe(false);

      // Add collision event to ship
      const eventsComp = world.getComponent(ship, "CollisionEvents") as any;
      eventsComp.collisions.push({
        otherEntity: asteroid,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      });

      // Update
      world.update(0.016);

      // Ship should be moved to center and be marked as invulnerable
      const transform = world.getComponent(ship, "Transform") as any;
      const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
      expect(transform.x).toBe(screen.width / 2);
      expect(transform.y).toBe(screen.height / 2);

      expect(world.hasComponent(ship, "Invulnerable" as any)).toBe(true);

      const state = game.getGameState();
      expect(state.lives).toBe(2); // lives decremented from 3 to 2
    });
  });

  describe("AsteroidGameStateSystem", () => {
    it("should advance level and spawn next wave when all asteroids are cleared", () => {
      // Clear initially spawned asteroids
      const initialAsteroids = world.query("Asteroid");
      for (const entity of initialAsteroids) {
        world.getCommandBuffer().removeEntity(entity);
      }

      // Tick world to process deferred removals
      world.update(0.016);
      // Tick again to detect 0 asteroids and spawn next wave
      world.update(0.016);

      // Verify level advanced and next wave is spawned
      const state = game.getGameState();
      expect(state.level).toBe(2);

      const newAsteroids = world.query("Asteroid");
      // Initial asteroid count is 5. For level 2, it should spawn (5 + (2 - 1)) = 6 asteroids.
      expect(newAsteroids.length).toBe(6);
    });
  });
});

import { World } from "../src/ecs/World";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../src/games/asteroids/types/AsteroidRegistry";
import { createAsteroid, fragmentAsteroid, createShip } from "../src/games/asteroids/EntityFactory";
import { computeShipPhysics } from "../src/games/asteroids/utils/AsteroidPhysics";
import { AsteroidCollisionSystem } from "../src/games/asteroids/systems/AsteroidCollisionSystem";
import { TTLSystem } from "../src/systems/TTLSystem";

describe("Phase 1-3 New Corrections Unit Tests", () => {
  describe("1. fragmentAsteroid during World update (isUpdating = true)", () => {
    it("should successfully fragment asteroid and set child velocities directly without failing", () => {
      const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
      world.gameplayRandom.unlock();

      // Create a large parent asteroid
      const parent = createAsteroid({ world, x: 100, y: 100, size: "large" });

      // Simulate being in an update block
      // (world.update/scheduler sets _isUpdating = true during runs)
      // We can trigger fragmentation within a custom system update or mock
      world.addSystem({
        update(w) {
          // Verify we are indeed inside update
          expect(w.isUpdating).toBe(true);

          // Trigger fragmentation
          fragmentAsteroid(w as any, parent);
        },
        onRegister() {},
        dispose() {}
      });

      // Update the world (this calls our system)
      world.update(0.016);

      // Flush commands so deferred creations are materialised
      world.flush();

      // Verify that two medium child asteroids were created
      const asteroids = world.query("Asteroid");
      const mediumAsteroids = asteroids.filter(id => {
        const a = world.getComponent(id, "Asteroid")!;
        return a.size === "medium";
      });

      expect(mediumAsteroids.length).toBe(2);

      // Verify they have non-zero velocities set at construction
      for (const child of mediumAsteroids) {
        const vel = world.getComponent(child, "Velocity")!;
        expect(vel.vx).not.toBe(0);
        expect(vel.vy).not.toBe(0);
      }
    });
  });

  describe("2. Invulnerable component expiration & vulnerability", () => {
    it("should decrement remaining time and remove Invulnerable component when <= 0", () => {
      const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
      const ttlSystem = new TTLSystem();
      world.addSystem(ttlSystem);

      const ship = createShip({ world, x: 100, y: 100 });
      world.addComponent(ship, { type: "LocalPlayer" } as any);

      // Add invulnerability for 1.5 seconds
      world.addComponent(ship, {
        type: "Invulnerable",
        remaining: 1.5
      } as any);

      expect(world.hasComponent(ship, "Invulnerable" as any)).toBe(true);

      // Advance by 0.5s - should still be invulnerable
      world.update(0.5);
      expect(world.hasComponent(ship, "Invulnerable" as any)).toBe(true);
      const inv = world.getComponent(ship, "Invulnerable" as any) as any;
      expect(inv).toBeDefined();
      expect(inv.remaining).toBeCloseTo(1.0, 4);

      // Advance by 1.1s (crossing the remaining 1.0s threshold in a single step)
      world.update(1.1);

      // Flush command buffer to apply the deferred removal of component
      world.flush();

      expect(world.hasComponent(ship, "Invulnerable" as any)).toBe(false);
    });

    it("should make ship vulnerable to collisions immediately after invulnerability expires", () => {
      const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
      world.gameplayRandom.unlock(); // Unlock random for the test!

      const collisionSystem = new AsteroidCollisionSystem();
      const ttlSystem = new TTLSystem();

      world.addSystem(ttlSystem);
      world.addSystem(collisionSystem);

      // Setup GameState singleton
      const stateEntity = world.createEntity();
      world.addComponent(stateEntity, {
        type: "GameState",
        score: 0,
        level: 1,
        lives: 3,
        isGameOver: false
      });

      const ship = createShip({ world, x: 100, y: 100 });
      world.addComponent(ship, { type: "LocalPlayer" } as any);

      const asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });

      // Add invulnerability for 0.1s
      world.addComponent(ship, {
        type: "Invulnerable",
        remaining: 0.1
      } as any);

      // Setup collision events
      world.addComponent(ship, {
        type: "CollisionEvents",
        collisions: [{ otherEntity: asteroid, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      // Update 1: while invulnerable, collision is ignored, lives remain 3
      world.update(0.05);
      world.flush();
      expect(world.getSingleton("GameState")!.lives).toBe(3);

      // Update 2: advance by 0.1s so invulnerability expires and TTL removes the component
      world.update(0.1);
      world.flush();
      expect(world.hasComponent(ship, "Invulnerable" as any)).toBe(false);

      // Setup new collision event (clearing old events to prevent duplicate processing)
      world.mutateComponent(ship, "CollisionEvents", (comp) => {
        comp.collisions = [{ otherEntity: asteroid, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }];
      });

      // Update 3: collision should now resolve, decrementing lives from 3 to 2
      world.update(0.016);
      world.flush();

      expect(world.getSingleton("GameState")!.lives).toBe(2);
    });
  });

  describe("3. computeShipPhysics with analog rotationAmount", () => {
    const config = { SHIP_THRUST: 150, SHIP_ROTATION_SPEED: 4.0, SHIP_FRICTION: 0.5 };

    it("should scale angular rotation proportionally with rotationAmount", () => {
      const transform = { rotation: 0 };
      const velocity = { vx: 0, vy: 0 };

      // rotationAmount = 0.5 (should rotate half the speed clockwise)
      let result = computeShipPhysics(transform, velocity, { rotationAmount: 0.5 } as any, config, 0.1);
      expect(result.rotation).toBeCloseTo(0.5 * 4.0 * 0.1, 4); // 0.2

      // rotationAmount = -0.3 (should rotate 30% speed counter-clockwise)
      result = computeShipPhysics(transform, velocity, { rotationAmount: -0.3 } as any, config, 0.1);
      expect(result.rotation).toBeCloseTo(-0.3 * 4.0 * 0.1, 4); // -0.12

      // rotationAmount = 1.0 (full speed clockwise)
      result = computeShipPhysics(transform, velocity, { rotationAmount: 1.0 } as any, config, 0.1);
      expect(result.rotation).toBeCloseTo(1.0 * 4.0 * 0.1, 4); // 0.4

      // rotationAmount = -1.0 (full speed counter-clockwise)
      result = computeShipPhysics(transform, velocity, { rotationAmount: -1.0 } as any, config, 0.1);
      expect(result.rotation).toBeCloseTo(-1.0 * 4.0 * 0.1, 4); // -0.4

      // rotationAmount = 0 (no rotation)
      result = computeShipPhysics(transform, velocity, { rotationAmount: 0 } as any, config, 0.1);
      expect(result.rotation).toBe(0);
    });

    it("should fall back to rotateLeft/rotateRight when rotationAmount is missing or 0", () => {
      const transform = { rotation: 0 };
      const velocity = { vx: 0, vy: 0 };

      // rotateLeft is true
      let result = computeShipPhysics(transform, velocity, { rotateLeft: true } as any, config, 0.1);
      expect(result.rotation).toBeCloseTo(-4.0 * 0.1, 4); // -0.4

      // rotateRight is true
      result = computeShipPhysics(transform, velocity, { rotateRight: true } as any, config, 0.1);
      expect(result.rotation).toBeCloseTo(4.0 * 0.1, 4); // 0.4

      // rotationAmount is 0, rotateRight is true (rotationAmount takes precedence, so 0 rotation)
      result = computeShipPhysics(transform, velocity, { rotationAmount: 0, rotateRight: true } as any, config, 0.1);
      expect(result.rotation).toBe(0);
    });
  });
});

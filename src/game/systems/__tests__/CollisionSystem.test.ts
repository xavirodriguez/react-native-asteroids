import { World } from "../../ecs-world";
import { CollisionSystem } from "../CollisionSystem";
import { GAME_CONFIG } from "../../../types/GameTypes";

describe("CollisionSystem", () => {
  let world: World;
  let system: CollisionSystem;

  beforeEach(() => {
    world = new World();
    system = new CollisionSystem();
    world.addSystem(system);
  });

  test("should detect collision between two circles", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Position", x: 100, y: 100 });
    world.addComponent(e1, { type: "Collider", radius: 10 });

    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Position", x: 115, y: 100 });
    world.addComponent(e2, { type: "Collider", radius: 10 });

    // Distance is 15, sum of radii is 20 -> Collision!
    // We need to mock handleCollision or check its effects.
    // Let's make one a bullet and one an asteroid.
    world.addComponent(e1, { type: "TTL", remaining: 1000 }); // Bullet
    world.addComponent(e2, { type: "Asteroid", size: "large" });

    world.update(16);

    // Bullet should be removed, Asteroid should be replaced by 2 medium ones
    expect(world.getAllEntities()).not.toContain(e1);
    expect(world.getAllEntities()).not.toContain(e2);
    expect(world.query("Asteroid").length).toBe(2);
  });

  test("should handle ship vs asteroid collision with invulnerability", () => {
    const ship = world.createEntity();
    world.addComponent(ship, { type: "Position", x: 100, y: 100 });
    world.addComponent(ship, { type: "Collider", radius: 10 });
    world.addComponent(ship, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });

    const asteroid = world.createEntity();
    world.addComponent(asteroid, { type: "Position", x: 105, y: 100 });
    world.addComponent(asteroid, { type: "Collider", radius: 10 });
    world.addComponent(asteroid, { type: "Asteroid", size: "small" });

    // First collision
    world.update(16);

    const health = world.getComponent(ship, "Health") as any;
    expect(health.current).toBe(2);
    expect(health.invulnerableRemaining).toBe(GAME_CONFIG.INVULNERABILITY_DURATION);

    // Second collision immediately after (should be ignored)
    world.update(16);
    expect(health.current).toBe(2);
  });
});

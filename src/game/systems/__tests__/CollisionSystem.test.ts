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

  it("should detect collision between two circles", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Position", x: 100, y: 100 });
    world.addComponent(e1, { type: "Collider", radius: 10 });
    world.addComponent(e1, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });

    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Position", x: 115, y: 100 });
    world.addComponent(e2, { type: "Collider", radius: 10 });
    world.addComponent(e2, { type: "Asteroid", size: "large" });

    // Distance is 15. Sum of radii is 20. Should collide.
    world.update(0);

    const health = world.getComponent(e1, "Health") as any;
    expect(health.current).toBe(2);
    expect(health.invulnerableRemaining).toBe(GAME_CONFIG.INVULNERABILITY_DURATION);
  });

  it("should respect invulnerability", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Position", x: 100, y: 100 });
    world.addComponent(e1, { type: "Collider", radius: 10 });
    world.addComponent(e1, { type: "Health", current: 3, max: 3, invulnerableRemaining: 1000 });

    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Position", x: 105, y: 100 });
    world.addComponent(e2, { type: "Collider", radius: 10 });
    world.addComponent(e2, { type: "Asteroid", size: "large" });

    world.update(0);

    const health = world.getComponent(e1, "Health") as any;
    expect(health.current).toBe(3); // No health lost
  });
});

import { World } from "../../ecs-world";
import { TTLSystem } from "../TTLSystem";

describe("TTLSystem", () => {
  let world: World;
  let system: TTLSystem;

  beforeEach(() => {
    world = new World();
    system = new TTLSystem();
    world.addSystem(system);
  });

  test("should decrement TTL and remove entity when expired", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(500);
    let ttl = world.getComponent(entity, "TTL") as any;
    expect(ttl.remaining).toBe(500);
    expect(world.getAllEntities()).toContain(entity);

    world.update(600);
    expect(world.getAllEntities()).not.toContain(entity);
  });
});

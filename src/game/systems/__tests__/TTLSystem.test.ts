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

  it("should decrement TTL and remove entity when it reaches 0", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 100 });

    world.update(50);
    expect(world.getComponent(entity, "TTL")).toBeDefined();

    world.update(60);
    expect(world.getComponent(entity, "TTL")).toBeUndefined();
    expect(world.getAllEntities()).not.toContain(entity);
  });
});

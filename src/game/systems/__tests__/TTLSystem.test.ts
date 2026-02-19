import { World } from "../../ecs-world";
import { TTLSystem } from "../TTLSystem";

describe("TTLSystem", () => {
  let world: World;
  let ttlSystem: TTLSystem;

  beforeEach(() => {
    world = new World();
    ttlSystem = new TTLSystem();
    world.addSystem(ttlSystem);
  });

  test("should decrement TTL", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(500);

    const ttl = world.getComponent(entity, "TTL") as any;
    expect(ttl.remaining).toBe(500);
  });

  test("should remove entity when TTL expires", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(1000);

    expect(world.getAllEntities()).not.toContain(entity);
  });

  test("should not remove entity if TTL has not expired", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(999);

    expect(world.getAllEntities()).toContain(entity);
  });
});

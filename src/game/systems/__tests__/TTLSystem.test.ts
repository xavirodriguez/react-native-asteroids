import { World } from "../../ecs-world";
import { TTLSystem } from "../TTLSystem";
import type { TTLComponent } from "../../../types/GameTypes";

describe("TTLSystem", () => {
  let world: World;
  let system: TTLSystem;

  beforeEach(() => {
    world = new World();
    system = new TTLSystem();
    world.addSystem(system);
  });

  test("should reduce remaining TTL", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(400);

    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    expect(ttl?.remaining).toBe(600);
  });

  test("should remove entity when TTL reaches zero", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(1000);

    expect(world.getAllEntities()).not.toContain(entity);
  });

  test("should remove entity when TTL becomes negative", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "TTL", remaining: 1000 });

    world.update(1500);

    expect(world.getAllEntities()).not.toContain(entity);
  });
});

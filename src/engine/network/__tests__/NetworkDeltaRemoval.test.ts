import { World } from "../../core/World";
import { ReplicationStateTracker } from "../ReplicationStateTracker";
import { NetworkDeltaSystem } from "../NetworkDeltaSystem";

describe("NetworkDeltaSystem - Entity Removal", () => {
  let world: World;
  let tracker: ReplicationStateTracker;
  let system: NetworkDeltaSystem;

  beforeEach(() => {
    world = new World();
    tracker = new ReplicationStateTracker();
    system = new NetworkDeltaSystem(tracker);
  });

  test("should identify removed entities no longer in interest set", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 10, y: 20 });

    // Initial sync to make it "known"
    system.generateDelta(world, "client1", 1, 0, new Set([entity]), true);
    expect(tracker.isKnown("client1", entity)).toBe(true);

    // Generate delta with empty interest set
    const packet = system.generateDelta(world, "client1", 2, 1, new Set([]), false);

    expect(packet.removed).toContain(entity.toString());
    expect(tracker.isKnown("client1", entity)).toBe(false);
  });

  test("should identify removed entities destroyed in world", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 10, y: 20 });

    // Initial sync to make it "known"
    system.generateDelta(world, "client1", 1, 0, new Set([entity]), true);

    // Destroy entity in world
    world.removeEntity(entity);
    world.flush();

    // Generate delta with same interest set (but entity is gone from world)
    const packet = system.generateDelta(world, "client1", 2, 1, new Set([entity]), false);

    expect(packet.removed).toContain(entity.toString());
    expect(tracker.isKnown("client1", entity)).toBe(false);
  });
});

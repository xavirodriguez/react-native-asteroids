import { World } from "../../core/World";
import { ReplicationStateTracker } from "../ReplicationStateTracker";
import { NetworkDeltaSystem } from "../NetworkDeltaSystem";

describe("NetworkDeltaSystem", () => {
  let world: World;
  let tracker: ReplicationStateTracker;
  let system: NetworkDeltaSystem;

  beforeEach(() => {
    world = new World();
    tracker = new ReplicationStateTracker();
    system = new NetworkDeltaSystem(tracker);
  });

  test("should generate full payload for new entities", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 10, y: 20 });

    const packet = system.generateDelta(world, "client1", 1, 0, new Set([entity]), true);

    expect(packet.full).toBe(true);
    expect(packet.created.length).toBe(1);
    expect(packet.created[0].entityId).toBe(entity);
    expect(packet.created[0].components.Transform).toBeDefined();
  });

  test("should generate delta for changed components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 10, y: 20 });

    // Initial sync
    system.generateDelta(world, "client1", 1, 0, new Set([entity]), true);

    // Mutate
    world.mutateComponent(entity, "Transform", t => { (t as any).x = 100; });

    const packet = system.generateDelta(world, "client1", 2, 1, new Set([entity]), false);

    expect(packet.full).toBe(false);
    expect(packet.created.length).toBe(0);
    expect(packet.updated.length).toBe(1);
    expect(packet.updated[0].components.Transform).toBeDefined();
    expect((packet.updated[0].components.Transform as any).x).toBe(100);
  });

  test("should not include unchanged components in delta", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 10, y: 20 });
    world.addComponent(entity, { type: "Health", current: 100, max: 100 });

    // Initial sync - recordSent happens here
    system.generateDelta(world, "client1", 1, 0, new Set([entity]), true);

    // Mutate only Transform - this should increment world.stateVersion
    world.mutateComponent(entity, "Transform", t => { (t as any).x = 100; });

    const packet = system.generateDelta(world, "client1", 2, 1, new Set([entity]), false);

    expect(packet.updated[0].components.Transform).toBeDefined();
    expect(packet.updated[0].components.Health).toBeUndefined();
  });
});

import {
  World,
  NullTransport,
  NetworkManager,
  ClientAckTracker,
  NetworkDeltaSystem,
  NetworkBudgetManager,
  BinaryCompression,
  InterestManagerSystem,
  NetworkReplicationUtils,
  ObjectPool,
  RandomService,
  ComponentSetPool
} from "../src";

import {
  runLifecycleSync,
  runLifecycleAsync
} from "../src/utils/LifecycleUtils";

describe("NullTransport", () => {
  it("should implement NetworkTransport interface correctly", async () => {
    const transport = new NullTransport();
    expect(transport.isOffline).toBe(true);

    await expect(transport.connect("ws://localhost")).resolves.toBeUndefined();
    expect(() => transport.send("test", {})).not.toThrow();
    expect(() => transport.onMessage("test", () => {})).not.toThrow();
    expect(() => transport.disconnect()).not.toThrow();
  });
});

describe("NetworkManager & NetworkReplicationUtils", () => {
  it("should manage transport and provide compatibility stubs", () => {
    const defaultManager = new NetworkManager();
    expect(defaultManager.getTransport()).toBeInstanceOf(NullTransport);

    const customTransport = new NullTransport();
    const manager = new NetworkManager(customTransport);
    expect(manager.getTransport()).toBe(customTransport);

    const anotherTransport = new NullTransport();
    manager.setTransport(anotherTransport);
    expect(manager.getTransport()).toBe(anotherTransport);

    const registered = NetworkManager.registerGame("asteroids", {}, { transport: customTransport });
    expect(registered.getTransport()).toBe(customTransport);

    const replicator = manager.getReplicator();
    expect(replicator.resolveEntity("1", {})).toBe(0);
    expect(replicator.getLocalId("1")).toBeUndefined();
    expect(replicator.getMappings()).toBeInstanceOf(Map);
    expect(() => replicator.removeMapping("1")).not.toThrow();

    const strategy = manager.getStrategy();
    expect(() => strategy.recordPrediction({}, {})).not.toThrow();

    expect(() => manager.processServerUpdate(1, {} as any)).not.toThrow();
    expect(() => manager.reset()).not.toThrow();

    expect(() => NetworkReplicationUtils.applyDelta({} as any, {})).not.toThrow();
  });
});

describe("MultiplayerSystems", () => {
  it("should cover stub classes in MultiplayerSystems", () => {
    const tracker = new ClientAckTracker();
    expect(() => tracker.recordAck("session", 1, 10)).not.toThrow();
    expect(tracker.nextSequence("session")).toBe(0);
    expect(tracker.getLastAckedSequence("session")).toBe(0);
    expect(tracker.getIdleTime("session")).toBe(0);

    const replicationTracker = {};
    const deltaSystem = new NetworkDeltaSystem(replicationTracker);
    expect(deltaSystem.generateDelta({}, "session", 1, 0, new Set(), false)).toEqual({});

    const budgetManager = new NetworkBudgetManager();
    const interest = [{ id: 1 }];
    expect(budgetManager.prioritize("session", interest)).toBe(interest);

    const mockWorld = {};
    const interestManager = new InterestManagerSystem();
    expect(() => interestManager.update(mockWorld, 0.16)).not.toThrow();
    expect(() => interestManager.onRegister(mockWorld)).not.toThrow();
    expect(() => interestManager.dispose()).not.toThrow();
  });

  it("should serialize and deserialize using BinaryCompression", () => {
    const payload = { hello: "world", nested: { num: 42, array: [1, 2, 3] } };
    const packed = BinaryCompression.pack(payload);
    expect(packed).toBeInstanceOf(Uint8Array);

    const unpacked = BinaryCompression.unpack(packed);
    expect(unpacked).toEqual(payload);

    const bufferUnpacked = BinaryCompression.unpack(Buffer.from(packed));
    expect(bufferUnpacked).toEqual(payload);
  });
});

describe("ObjectPool", () => {
  it("should manage pool size, acquire and release correctly", () => {
    let createdCount = 0;
    const factory = () => {
      createdCount++;
      return { id: createdCount, active: false };
    };
    const reset = (obj: any) => {
      obj.active = false;
    };

    const pool = new ObjectPool(factory, reset, 3);
    expect(pool.size).toBe(3);
    expect(createdCount).toBe(3);

    const poolNoReset = new ObjectPool(factory);
    const item = poolNoReset.acquire();
    poolNoReset.release(item);
    expect(poolNoReset.size).toBe(1);

    const obj1 = pool.acquire();
    expect(obj1.id).toBe(3); // pop
    expect(pool.size).toBe(2);

    obj1.active = true;
    pool.release(obj1);
    expect(pool.size).toBe(3);
    expect(obj1.active).toBe(false); // reset was called

    const obj2 = pool.acquire();
    const obj3 = pool.acquire();
    const obj4 = pool.acquire();
    const obj5 = pool.acquire(); // creates new
    expect(obj5.id).toBe(5);
    expect(pool.size).toBe(0);

    pool.clear();
    expect(pool.size).toBe(0);
  });
});

describe("RandomService", () => {
  it("should generate deterministic random values", () => {
    const rng = new RandomService(12345);
    expect(rng.getSeed()).toBe(12345);

    rng.setSeed(54321);
    expect(rng.getSeed()).toBe(54321);

    const val1 = rng.next();
    expect(val1).toBeGreaterThanOrEqual(0);
    expect(val1).toBeLessThanOrEqual(1);

    const rangeVal = rng.range(5, 10);
    expect(rangeVal).toBeGreaterThanOrEqual(5);
    expect(rangeVal).toBeLessThanOrEqual(10);

    const intVal = rng.rangeInt(10, 20);
    expect(intVal).toBeGreaterThanOrEqual(10);
    expect(intVal).toBeLessThan(20);

    const nextRangeVal = rng.nextRange(100, 200);
    expect(nextRangeVal).toBeGreaterThanOrEqual(100);
    expect(nextRangeVal).toBeLessThanOrEqual(200);

    const nextIntVal = rng.nextInt(500, 600);
    expect(nextIntVal).toBeGreaterThanOrEqual(500);
    expect(nextIntVal).toBeLessThan(600);

    expect(RandomService.lockGameplayContext).toBe(false);
  });
});

describe("LifecycleUtils", () => {
  it("should run sync and async lifecycles", async () => {
    let syncCalled = false;
    runLifecycleSync(() => {
      syncCalled = true;
    });
    expect(syncCalled).toBe(true);

    let asyncCalled = false;
    await runLifecycleAsync(async () => {
      asyncCalled = true;
    });
    expect(asyncCalled).toBe(true);
  });
});

describe("ComponentSetPool", () => {
  interface MockComp {
    type: string;
    value: number;
    onReclaim?: (world: World, entity: any) => void;
  }

  it("should acquire and release component sets", () => {
    const factory = () => ({
      position: { type: "Position", value: 10 } as MockComp,
      reclaimable: { type: "Reclaimable", value: 20 } as MockComp
    });

    const reset = (data: any) => {
      data.position.value = 0;
      data.reclaimable.value = 0;
    };

    const world = new World<any>();
    const pool = new ComponentSetPool(factory, reset, 2);

    expect(pool.size).toBe(3);

    // Acquire when world is not updating
    const { entity, components } = pool.acquire(world);
    expect(components.position.value).toBe(0); // since it was reset in the pool
    components.position.value = 10;
    expect(components.reclaimable.onReclaim).toBeDefined();

    // Releasing components
    expect(pool.size).toBe(2);
    pool.release(world, entity);
    expect(pool.size).toBe(3);

    // Acquire when world is updating
    world.isUpdating = true;
    const { entity: deferredEntity, components: deferredComponents } = pool.acquire(world);
    expect(deferredComponents.reclaimable.onReclaim).toBeDefined();

    world.isUpdating = false;
  });
});

import { PrefabPool, ProjectilePool, UnifiedInputSystem } from "../src";

describe("PrefabPool", () => {
  it("should initialize and manage prefab entities", () => {
    const factory = () => ({
      position: { type: "Position", value: 100 }
    });
    const reset = (data: any) => {
      data.position.value = 0;
    };
    const initializer = (components: any, params: any, world: World, entity: any) => {
      components.position.value = params.startPos;
    };

    const world = new World<any>();
    const pool = new PrefabPool({
      factory,
      reset,
      initializer,
      initialSize: 3
    });

    expect(pool.size).toBe(4); // 3 + 1 template optimization

    const entity = pool.acquire(world, { startPos: 42 });
    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.value).toBe(42);

    pool.release(world, entity);
    expect(pool.size).toBe(4);
  });
});

describe("ProjectilePool", () => {
  class TestProjectilePool extends ProjectilePool {
    constructor() {
      super({
        factory: () => ({
          position: { type: "Position", x: 0, y: 0 },
          velocity: { type: "Velocity", vx: 0, vy: 0 },
          render: { type: "Render", color: "white" },
          collider: { type: "Collider2D", radius: 5 },
          ttl: { type: "TTL", timeLeft: 1.0 },
          reclaimable: { type: "Reclaimable" }
        } as any),
        reset: (data: any) => {
          data.position.x = 0;
          data.position.y = 0;
        },
        initializer: (components: any, params: any, world: World, entity: any) => {
          components.position.x = params.x;
          components.position.y = params.y;
        }
      });
    }
  }

  it("should inherit and work as a projectile pool", () => {
    const world = new World<any>();
    const pool = new TestProjectilePool();
    const entity = pool.acquire(world, { x: 10, y: 20 } as any);
    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(20);
  });
});

describe("UnifiedInputSystem", () => {
  it("should manage action overrides and keys binding", () => {
    const system = new UnifiedInputSystem();
    const world = new World<any>();

    expect(system.getAction("shoot")).toBe(false);

    system.setOverride("shoot", true);
    expect(system.getAction("shoot")).toBe(true);

    system.setOverride("shoot", false);
    expect(system.getAction("shoot")).toBe(false);

    expect(() => system.bind("shoot", ["Space"])).not.toThrow();
    expect(() => system.update(world, 0.16)).not.toThrow();
  });
});

import { Camera2DSystem, JoystickSystem, FeedbackSystem } from "../src";

describe("Camera2DSystem & JoystickSystem", () => {
  it("should cover simple update methods", () => {
    const world = new World<any>();
    const cameraSystem = new Camera2DSystem();
    const joystickSystem = new JoystickSystem();

    expect(() => cameraSystem.update(world, 0.16)).not.toThrow();
    expect(() => joystickSystem.update(world, 0.16)).not.toThrow();
  });
});

describe("FeedbackSystem", () => {
  it("should handle haptic requests and re-simulations", () => {
    const world = new World<any>();
    const feedbackSystem = new FeedbackSystem();

    // Re-simulation early return
    world.isReSimulating = true;
    expect(() => feedbackSystem.update(world, 0.16)).not.toThrow();

    // Normal path
    world.isReSimulating = false;
    const entity = world.createEntity();
    world.addComponent(entity, { type: "HapticRequest", intensity: 1 } as any);

    feedbackSystem.update(world, 0.16);

    // Verify component is scheduled to be removed via CommandBuffer
    world.getCommandBuffer().flush(world);
    expect(world.getComponent(entity, "HapticRequest" as any)).toBeUndefined();
  });
});

import { browserFrameScheduler, ConfigService, RenderCommandBufferImpl, PhysicsUtils } from "../src";

describe("browserFrameScheduler", () => {
  it("should get time, request and cancel frames", (done) => {
    const time = browserFrameScheduler.now();
    expect(time).toBeGreaterThan(0);

    const handle = browserFrameScheduler.requestFrame((t) => {
      expect(t).toBeGreaterThan(0);
      done();
    });

    expect(handle).toBeDefined();

    const anotherHandle = browserFrameScheduler.requestFrame(() => {});
    expect(() => browserFrameScheduler.cancelFrame(anotherHandle)).not.toThrow();
  });
});

describe("ConfigService", () => {
  it("should load raw config safely", () => {
    const raw = { value: 123 };
    const loaded = ConfigService.load("test", {}, raw);
    expect(loaded).toBe(raw);
  });
});

describe("RenderCommandBufferImpl", () => {
  it("should push, clear and retrieve commands", () => {
    const buffer = new RenderCommandBufferImpl();
    expect(buffer.getCommands()).toEqual([]);

    buffer.push({ type: "rect", x: 10, y: 20 } as any);
    expect(buffer.getCommands().length).toBe(1);

    buffer.clear();
    expect(buffer.getCommands()).toEqual([]);
  });
});

describe("PhysicsUtils", () => {
  it("should overlap, clamp and lerp correctly", () => {
    expect(PhysicsUtils.circleOverlap(0, 0, 5, 0, 8, 5)).toBe(true);
    expect(PhysicsUtils.circleOverlap(0, 0, 5, 0, 12, 5)).toBe(false);

    expect(PhysicsUtils.clamp(5, 10, 20)).toBe(10);
    expect(PhysicsUtils.clamp(25, 10, 20)).toBe(20);
    expect(PhysicsUtils.clamp(15, 10, 20)).toBe(15);

    expect(PhysicsUtils.lerp(10, 20, 0.5)).toBe(15);
  });
});

import { filterSoASnapshot } from "../src/snapshots/WorldSnapshot";

describe("WorldSnapshot filterSoASnapshot", () => {
  it("should return the original snapshot if it is not SoA or has no soaComponentData", () => {
    const snap1 = { isSoA: false } as any;
    expect(filterSoASnapshot(snap1, new Set([1]))).toBe(snap1);

    const snap2 = { isSoA: true } as any;
    expect(filterSoASnapshot(snap2, new Set([1]))).toBe(snap2);
  });

  it("should correctly filter SoA component data based on interest IDs", () => {
    const originalSnapshot = {
      isSoA: true,
      entities: [1, 2, 3],
      soaComponentData: {
        Position: {
          keys: ["x", "y"],
          entities: new Int32Array([1, 2, 3]),
          values: new Float64Array([10, 11, 20, 21, 30, 31]),
          nonNumericValues: ["n1", "n2", "n3", "n4", "n5", "n6"],
          booleanKeys: []
        }
      }
    } as any;

    const interest = new Set([1, 3]);
    const filtered = filterSoASnapshot(originalSnapshot, interest) as any;

    expect(filtered.entities).toEqual([1, 3]);
    expect(filtered.soaComponentData.Position).toBeDefined();
    expect(filtered.soaComponentData.Position.entities).toEqual(new Int32Array([1, 3]));
    expect(filtered.soaComponentData.Position.values).toEqual(new Float64Array([10, 11, 30, 31]));
    expect(filtered.soaComponentData.Position.nonNumericValues).toEqual(["n1", "n2", "n5", "n6"]);
  });

  it("should skip component types if matching indices length is 0", () => {
    const originalSnapshot = {
      isSoA: true,
      entities: [1, 2],
      soaComponentData: {
        Position: {
          keys: ["x", "y"],
          entities: new Int32Array([1, 2]),
          values: new Float64Array([10, 11, 20, 21]),
          booleanKeys: []
        }
      }
    } as any;

    const interest = new Set([99]);
    const filtered = filterSoASnapshot(originalSnapshot, interest) as any;

    expect(filtered.entities).toEqual([]);
    expect(filtered.soaComponentData.Position).toBeUndefined();
  });

  it("should fallback to checking object keys if entities is not array-like", () => {
    const fakeEntitiesObj = { "0": 1, "1": 2 }; // no length
    const originalSnapshot = {
      isSoA: true,
      entities: [1, 2],
      soaComponentData: {
        Position: {
          keys: ["x"],
          entities: fakeEntitiesObj,
          values: new Float64Array([10, 20]),
          booleanKeys: []
        }
      }
    } as any;

    const interest = new Set([2]);
    const filtered = filterSoASnapshot(originalSnapshot, interest) as any;

    expect(filtered.entities).toEqual([2]);
    expect(filtered.soaComponentData.Position).toBeDefined();
    expect(filtered.soaComponentData.Position.entities).toEqual(new Int32Array([2]));
    expect(filtered.soaComponentData.Position.values).toEqual(new Float64Array([20]));
  });
});

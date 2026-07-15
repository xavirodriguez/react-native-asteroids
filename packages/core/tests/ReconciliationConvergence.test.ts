import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { ReplicationSystem, AuthoritativeServerState } from "../src/network/ReplicationSystem";
import { MovementSystem } from "../src/physics/systems/MovementSystem";
import { SystemPhase } from "../src/ecs/System";

interface TestRegistry extends CoreComponentRegistry {
  RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
  LocalPlayer: { type: "LocalPlayer" };
  Input: { type: "Input"; thrust?: boolean };
}

describe("Reconciliation Convergence under Latency and Jitter", () => {
  let clientWorld: World<TestRegistry>;
  let serverWorld: World<TestRegistry>;
  let clientReplicationSystem: ReplicationSystem<TestRegistry>;
  let serverReplicationSystem: ReplicationSystem<TestRegistry>;

  beforeEach(() => {
    clientWorld = new World<TestRegistry>();
    serverWorld = new World<TestRegistry>();
    clientReplicationSystem = new ReplicationSystem<TestRegistry>({} as any);
    serverReplicationSystem = new ReplicationSystem<TestRegistry>({} as any);

    clientWorld.addSystem(clientReplicationSystem, { phase: SystemPhase.Input });
    clientWorld.addSystem(new MovementSystem() as any, { phase: SystemPhase.Simulation });

    serverWorld.addSystem(serverReplicationSystem, { phase: SystemPhase.Input });
    serverWorld.addSystem(new MovementSystem() as any, { phase: SystemPhase.Simulation });
  });

  it("client predicted state should mathematically converge to server authoritative state after reconciliation", () => {
    // 1. Setup client player entity
    const clientPlayer = clientWorld.createEntity();
    clientWorld.addComponent(clientPlayer, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    clientWorld.addComponent(clientPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    clientWorld.addComponent(clientPlayer, {
      type: "LocalPlayer",
    });
    clientWorld.addComponent(clientPlayer, {
      type: "Input",
      thrust: true,
    });

    // 2. Setup server player entity
    const serverPlayer = serverWorld.createEntity();
    serverWorld.addComponent(serverPlayer, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    serverWorld.addComponent(serverPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    serverWorld.addComponent(serverPlayer, {
      type: "LocalPlayer",
    });
    serverWorld.addComponent(serverPlayer, {
      type: "Input",
      thrust: true,
    });

    const dt = 0.016;

    // Client runs ahead predicting inputs and updating physics
    for (let tick = 0; tick < 10; tick++) {
      clientWorld.update(dt);
    }

    // Server processes inputs with some latency/jitter
    // Let's say server processes ticks up to 5
    for (let tick = 0; tick <= 5; tick++) {
      serverWorld.update(dt);
    }

    // Authoritative Server state at tick 5 (represented by tick index 5, so after 6 updates: ticks 0 to 5)
    const serverTransformAt5 = serverWorld.getComponent(serverPlayer, "Transform")!;
    const serverVelocityAt5 = serverWorld.getComponent(serverPlayer, "Velocity")!;
    const authoritativeState: AuthoritativeServerState = {
      x: serverTransformAt5.x,
      y: serverTransformAt5.y,
      vx: serverVelocityAt5.vx,
      vy: serverVelocityAt5.vy,
    };

    // Client receives authoritative state of Tick 5 (after 6 updates) and reconciles
    clientReplicationSystem.reconcile(clientWorld, 5, authoritativeState);

    const reconciledClientTransform = clientWorld.getComponent(clientPlayer, "Transform")!;
    const reconciledClientVelocity = clientWorld.getComponent(clientPlayer, "Velocity")!;

    // Client is currently at Tick 9 (since we did 10 ticks: 0 to 9)
    // After reconciliation, client should have replayed ticks 6, 7, 8, 9
    // Therefore, the predicted state on client should converge EXACTLY with what the server would be at Tick 9!

    // Let's run the server up to Tick 9 (doing the remaining 4 ticks: 6 to 9)
    for (let tick = 6; tick < 10; tick++) {
      serverWorld.update(dt);
    }
    const serverTransformAt9 = serverWorld.getComponent(serverPlayer, "Transform")!;
    const serverVelocityAt9 = serverWorld.getComponent(serverPlayer, "Velocity")!;

    // Validate absolute convergence!
    expect(reconciledClientTransform.x).toBeCloseTo(serverTransformAt9.x, 4);
    expect(reconciledClientTransform.y).toBeCloseTo(serverTransformAt9.y, 4);
    expect(reconciledClientVelocity.vx).toBeCloseTo(serverVelocityAt9.vx, 4);
    expect(reconciledClientVelocity.vy).toBeCloseTo(serverVelocityAt9.vy, 4);
  });
});

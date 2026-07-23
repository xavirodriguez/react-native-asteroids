import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { ReplicationSystem, AuthoritativeServerState } from "../src/network/ReplicationSystem";
import { computeShipPhysics } from "../src/games/asteroids/utils/AsteroidPhysics";

interface TestRegistry extends CoreComponentRegistry {
  RemotePlayer: { type: "RemotePlayer"; targetX: number; targetY: number; targetRotation: number; sessionId: string };
  LocalPlayer: { type: "LocalPlayer" };
  Input: { type: "Input"; thrust?: boolean };
}

describe("ReplicationSystem Tests", () => {
  let world: World<TestRegistry>;
  let replicationSystem: ReplicationSystem<TestRegistry>;
  let mockNetworkManager: any;

  beforeEach(() => {
    world = new World<TestRegistry>();
    mockNetworkManager = {};
    replicationSystem = new ReplicationSystem<TestRegistry>(mockNetworkManager, computeShipPhysics);
  });

  it("debería realizar Client-Side Prediction y almacenar inputs con deltaTime real", () => {
    const localPlayer = world.createEntity();

    world.addComponent(localPlayer, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });

    world.addComponent(localPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });

    world.addComponent(localPlayer, {
      type: "LocalPlayer",
    });

    world.addComponent(localPlayer, {
      type: "Input",
      thrust: true,
    });

    // Tick 1: deltaTime = 20ms
    replicationSystem.update(world, 20);

    const velocity = world.getComponent(localPlayer, "Velocity")!;
    // El thrust aplica una aceleración (power = 150) modificando la velocidad
    // vx = ax * (20 / 1000) = cos(0) * 150 * 0.02 = 3
    expect(velocity.vx).toBeCloseTo(3, 4);
    expect(velocity.vy).toBe(0);

    // Tick 2: deltaTime = 30ms con thrust desactivado
    world.mutateComponent(localPlayer, "Input", (input) => {
      input.thrust = false;
    });

    replicationSystem.update(world, 30);

    // La velocidad no debería aumentar en este tick
    expect(velocity.vx).toBeCloseTo(3, 4);
  });

  it("debería realizar reconciliación y replay determinista usando deltaTimes guardados", () => {
    const localPlayer = world.createEntity();

    world.addComponent(localPlayer, {
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

    world.addComponent(localPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });

    world.addComponent(localPlayer, {
      type: "LocalPlayer",
    });

    world.addComponent(localPlayer, {
      type: "Input",
      thrust: true,
    });

    // Simulamos 2 updates del cliente locales con distintos deltas de tiempo
    // Tick 0: dt = 16ms, thrust = true
    replicationSystem.update(world, 16);
    // Tick 1: dt = 25ms, thrust = true
    replicationSystem.update(world, 25);

    // Posición estimada actual del cliente:
    // En tick 0 (dt=16): vx se convierte en cos(0) * 150 * 0.016 = 2.4
    // En tick 1 (dt=25): vx se convierte en 2.4 + cos(0) * 150 * 0.025 = 2.4 + 3.75 = 6.15

    // Ahora recibimos una actualización autoritativa del servidor para el Tick 0
    // El servidor dice que en Tick 0 el jugador estaba en x = 5, y = 0 con vx = 2.4, vy = 0
    const serverState: AuthoritativeServerState = {
      x: 5,
      y: 0,
      vx: 2.4,
      vy: 0,
    };

    // Reconciliamos el Tick 0 (lo que descarta la entrada del Tick 0 y hace replay de la entrada de Tick 1 con dt = 25ms)
    replicationSystem.reconcile(world, 0, serverState);

    const transform = world.getComponent(localPlayer, "Transform")!;
    const velocity = world.getComponent(localPlayer, "Velocity")!;

    // Esperado tras el replay del Tick 1 (dt = 25ms) partiendo del estado del servidor (x=5, vx=2.4):
    // 1. Reset al estado del servidor: x = 5, vx = 2.4
    // 2. Replay Tick 1 (thrust = true, dt = 25ms):
    //    vx_final = 2.4 + (cos(0) * 150 * 0.025) = 2.4 + 3.75 = 6.15
    //    x_final = 5 + (vx_final * 0.025) = 5 + (6.15 * 0.025) = 5 + 0.15375 = 5.15375
    expect(velocity.vx).toBeCloseTo(6.15, 4);
    expect(transform.x).toBeCloseTo(5.15375, 5);
  });

  it("debería realizar interpolación lineal (Lerp) para entidades remotas", () => {
    const remotePlayer = world.createEntity();

    world.addComponent(remotePlayer, {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 20,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });

    world.addComponent(remotePlayer, {
      type: "RemotePlayer",
      targetX: 20,
      targetY: 40,
      targetRotation: Math.PI / 2,
      sessionId: "remote-1",
    });

    // Ejecuta una actualización para interpolar (alpha = 0.15)
    replicationSystem.update(world, 16);

    const transform = world.getComponent(remotePlayer, "Transform")!;
    // x = 10 + (20 - 10) * 0.15 = 11.5
    // y = 20 + (40 - 20) * 0.15 = 23
    // rotation = 0 + (Math.PI/2 - 0) * 0.15 = 0.15 * Math.PI/2 = 0.235619
    expect(transform.x).toBeCloseTo(11.5, 4);
    expect(transform.y).toBeCloseTo(23, 4);
    expect(transform.rotation).toBeCloseTo(Math.PI / 2 * 0.15, 4);
  });
});

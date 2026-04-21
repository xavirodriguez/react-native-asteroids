import { World } from "../../../engine/core/World";
import { ShipPhysics } from "../utils/ShipPhysics";
import { DeterministicSimulation } from "../../../simulation/DeterministicSimulation";
import { TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { InputFrame } from "../../../multiplayer/NetTypes";

describe("Prediction vs ECS Determinism", () => {
  it("should produce identical results for ECS path and Prediction path", () => {
    // Scenario: We have a ship and we apply the same input for several ticks
    // using both the ECS ShipControlSystem (via DeterministicSimulation.update)
    // and a manual call to ShipPhysics.simulateShipTick (which simulate what predictLocalPlayer does)

    const dt = 16.666;
    const ticks = 10;

    // --- Setup World 1 (ECS Path) ---
    const world1 = new World();
    const ship1 = world1.createEntity();
    const pos1: TransformComponent = { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, dirty: true };
    const vel1: VelocityComponent = { type: "Velocity", dx: 0, dy: 0 };
    const render1: RenderComponent = { type: "Render", shape: "triangle", size: 10, color: "white", rotation: 0 };
    const input1: InputComponent = { type: "Input", thrust: true, rotateLeft: true, rotateRight: false, shoot: false, hyperspace: false, shootCooldownRemaining: 0 };

    world1.addComponent(ship1, pos1);
    world1.addComponent(ship1, vel1);
    world1.addComponent(ship1, render1);
    world1.addComponent(ship1, input1);
    world1.addComponent(ship1, { type: "Ship" } as any);
    world1.addComponent(ship1, { type: "ManualMovement" } as any);

    // --- Setup manual simulation (Manual Path) ---
    const pos2: TransformComponent = { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, dirty: true };
    const vel2: VelocityComponent = { type: "Velocity", dx: 0, dy: 0 };
    const render2: RenderComponent = { type: "Render", shape: "triangle", size: 10, color: "white", rotation: 0 };
    const input2: InputComponent = { type: "Input", thrust: true, rotateLeft: true, rotateRight: false, shoot: false, hyperspace: false, shootCooldownRemaining: 0 };
    const world2 = new World(); // Just for createBullet if needed

    for (let i = 0; i < ticks; i++) {
        // Update ECS
        DeterministicSimulation.update(world1, dt, { isResimulating: false });

        // Update Manual
        ShipPhysics.simulateShipTick(world2, pos2, vel2, render2, input2, dt, { isResimulating: false }, GAME_CONFIG);
    }

    const pos1Final = world1.getComponent<TransformComponent>(ship1, "Transform")!;
    const vel1Final = world1.getComponent<VelocityComponent>(ship1, "Velocity")!;

    expect(pos1Final.x).toBeCloseTo(pos2.x, 5);
    expect(pos1Final.y).toBeCloseTo(pos2.y, 5);
    expect(pos1Final.rotation).toBeCloseTo(pos2.rotation, 5);
    expect(vel1Final.dx).toBeCloseTo(vel2.dx, 5);
    expect(vel1Final.dy).toBeCloseTo(vel2.dy, 5);
  });
});

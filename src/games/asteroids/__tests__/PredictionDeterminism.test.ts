import { World } from "../../../engine/core/World";
import { ShipPhysics } from "../utils/ShipPhysics";
import { AsteroidsGame } from "../AsteroidsGame";
import { TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";

describe("Prediction vs ECS Determinism", () => {
  it("should produce identical results for ECS path and Prediction path", async () => {
    // Scenario: We have a ship and we apply the same input for several ticks
    // using both the ECS ShipControlSystem (via AsteroidsGame.runSimulationStep)
    // and a manual call to ShipPhysics.simulateShipTick (which simulates what predictLocalPlayer does)

    const dt = 16.666;
    const ticks = 10;

    // --- Setup World 1 (ECS Path) ---
    const game1 = new AsteroidsGame({ headless: true });
    await game1.init();
    const world1 = game1.getWorld();

    // Clear initial entities to have a clean slate
    const initialEntities = world1.query("Transform");
    initialEntities.forEach(e => world1.removeEntity(e));

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

    // --- Setup World 2 (Manual Path but using ECS correctly) ---
    const world2 = new World();
    const ship2 = world2.createEntity();
    const pos2: TransformComponent = { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, dirty: true };
    const vel2: VelocityComponent = { type: "Velocity", dx: 0, dy: 0 };
    const render2: RenderComponent = { type: "Render", shape: "triangle", size: 10, color: "white", rotation: 0 };
    const input2: InputComponent = { type: "Input", thrust: true, rotateLeft: true, rotateRight: false, shoot: false, hyperspace: false, shootCooldownRemaining: 0 };

    world2.addComponent(ship2, pos2);
    world2.addComponent(ship2, vel2);
    world2.addComponent(ship2, render2);
    world2.addComponent(ship2, input2);

    for (let i = 0; i < ticks; i++) {
        // Update ECS
        game1.runSimulationStep(dt, false);

        // Update Manual (calling simulateShipTick directly on world2 components)
        ShipPhysics.simulateShipTick(
            world2,
            ship2,
            world2.getComponent<TransformComponent>(ship2, "Transform")!,
            world2.getComponent<VelocityComponent>(ship2, "Velocity")!,
            world2.getComponent<RenderComponent>(ship2, "Render")!,
            world2.getComponent<InputComponent>(ship2, "Input")!,
            dt,
            { isResimulating: false },
            GAME_CONFIG
        );
    }

    const pos1Final = world1.getComponent<TransformComponent>(ship1, "Transform")!;
    const vel1Final = world1.getComponent<VelocityComponent>(ship1, "Velocity")!;
    const pos2Final = world2.getComponent<TransformComponent>(ship2, "Transform")!;
    const vel2Final = world2.getComponent<VelocityComponent>(ship2, "Velocity")!;

    expect(pos1Final.x).toBeCloseTo(pos2Final.x, 5);
    expect(pos1Final.y).toBeCloseTo(pos2Final.y, 5);
    expect(pos1Final.rotation).toBeCloseTo(pos2Final.rotation, 5);
    expect(vel1Final.dx).toBeCloseTo(vel2Final.dx, 5);
    expect(vel1Final.dy).toBeCloseTo(vel2Final.dy, 5);
  });
});

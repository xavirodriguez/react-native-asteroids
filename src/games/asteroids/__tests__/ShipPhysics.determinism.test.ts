import { World } from "../../../engine/core/World";
import { ShipPhysics } from "../utils/ShipPhysics";
import { TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";

describe("ShipPhysics Determinism", () => {
  it("should produce identical results for the same input", () => {
    const world1 = new World();
    const pos1: TransformComponent = { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
    const vel1: VelocityComponent = { type: "Velocity", dx: 0, dy: 0 };
    const render1: RenderComponent = { type: "Render", shape: "ship", size: 10, color: "white", rotation: 0 };
    const input1: InputComponent = { type: "Input", thrust: true, rotateLeft: true, shoot: false, hyperspace: false, shootCooldownRemaining: 0 };

    const world2 = new World();
    const pos2 = { ...pos1 };
    const vel2 = { ...vel1 };
    const render2 = { ...render1 };
    const input2 = { ...input1 };

    const dt = 16.67;

    ShipPhysics.simulateShipTick(world1, pos1, vel1, render1, input1, dt, undefined, GAME_CONFIG);
    ShipPhysics.simulateShipTick(world2, pos2, vel2, render2, input2, dt, undefined, GAME_CONFIG);

    expect(pos1.x).toBe(pos2.x);
    expect(pos1.y).toBe(pos2.y);
    expect(vel1.dx).toBe(vel2.dx);
    expect(vel1.dy).toBe(vel2.dy);
    expect(render1.rotation).toBe(render2.rotation);
  });
});

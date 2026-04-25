import { PhysicsBody2DComponent } from "../../../types/EngineTypes";
import { PhysicsUtils } from "../PhysicsUtils";

describe("PhysicsUtils.updateBodyMassProperties", () => {
  it("should update mass and inverseMass correctly", () => {
    const body: PhysicsBody2DComponent = {
      type: "PhysicsBody2D",
      bodyType: "dynamic",
      velocityX: 0,
      velocityY: 0,
      angularVelocity: 0,
      forceX: 0,
      forceY: 0,
      torque: 0,
      mass: 1,
      inverseMass: 1,
      inertia: 1,
      inverseInertia: 1,
      restitution: 0.5,
      staticFriction: 0.5,
      dynamicFriction: 0.3,
      gravityScale: 1,
      fixedRotation: false
    };

    PhysicsUtils.updateBodyMassProperties(body, 2, 4);

    expect(body.mass).toBe(2);
    expect(body.inverseMass).toBe(0.5);
    expect(body.inertia).toBe(4);
    expect(body.inverseInertia).toBe(0.25);
  });

  it("should handle zero mass correctly (static bodies)", () => {
    const body: PhysicsBody2DComponent = {
      type: "PhysicsBody2D",
      bodyType: "static",
      velocityX: 0,
      velocityY: 0,
      angularVelocity: 0,
      forceX: 0,
      forceY: 0,
      torque: 0,
      mass: 1,
      inverseMass: 1,
      inertia: 1,
      inverseInertia: 1,
      restitution: 0.5,
      staticFriction: 0.5,
      dynamicFriction: 0.3,
      gravityScale: 1,
      fixedRotation: false
    };

    PhysicsUtils.updateBodyMassProperties(body, 0, 0);

    expect(body.mass).toBe(0);
    expect(body.inverseMass).toBe(0);
    expect(body.inertia).toBe(0);
    expect(body.inverseInertia).toBe(0);
  });
});

import Matter from "matter-js";
import { IPhysicsAdapter } from "../../core/types/SystemTypes";

export class MatterPhysicsAdapter implements IPhysicsAdapter {
  private engine: Matter.Engine;
  private runner: Matter.Runner | null = null;
  private bodies = new Map<number | string, Matter.Body>();

  constructor(config?: Matter.IEngineDefinition) {
    this.engine = Matter.Engine.create(config);
  }

  update(dt: number): void {
    Matter.Engine.update(this.engine, dt);
  }

  createBody(entityId: number, config: any): Matter.Body {
    const { x, y, width, height, radius, isStatic, isSensor, restitution, friction, density, collisionFilter } = config;

    let body: Matter.Body;
    if (radius) {
      body = Matter.Bodies.circle(x, y, radius, {
        isStatic,
        isSensor,
        restitution,
        friction,
        density,
        collisionFilter,
        label: entityId.toString(),
      });
    } else {
      body = Matter.Bodies.rectangle(x, y, width, height, {
        isStatic,
        isSensor,
        restitution,
        friction,
        density,
        collisionFilter,
        label: entityId.toString(),
      });
    }

    Matter.Composite.add(this.engine.world, body);
    this.bodies.set(body.id, body);
    return body;
  }

  removeBody(bodyId: number): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      Matter.Composite.remove(this.engine.world, body);
      this.bodies.delete(bodyId);
    }
  }

  applyForce(bodyId: number, position: { x: number; y: number }, force: { x: number; y: number }): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      Matter.Body.applyForce(body, position, force);
    }
  }

  applyImpulse(bodyId: number, impulse: { x: number; y: number }): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      const currentVelocity = body.velocity;
      Matter.Body.setVelocity(body, {
        x: currentVelocity.x + impulse.x,
        y: currentVelocity.y + impulse.y,
      });
    }
  }

  setVelocity(bodyId: number, velocity: { x: number; y: number }): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      Matter.Body.setVelocity(body, velocity);
    }
  }

  setPosition(bodyId: number, position: { x: number; y: number }): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      Matter.Body.setPosition(body, position);
    }
  }

  setRotation(bodyId: number, angle: number): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      Matter.Body.setAngle(body, angle);
    }
  }

  getBodyTransform(bodyId: number): { x: number; y: number; rotation: number } {
    const body = this.bodies.get(bodyId);
    if (body) {
      return {
        x: body.position.x,
        y: body.position.y,
        rotation: body.angle,
      };
    }
    return { x: 0, y: 0, rotation: 0 };
  }

  getMatterWorld(): Matter.World {
    return this.engine.world;
  }

  getMatterEngine(): Matter.Engine {
    return this.engine;
  }
}

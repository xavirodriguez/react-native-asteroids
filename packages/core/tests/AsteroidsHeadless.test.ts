import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { MovementSystem } from "../src/physics/systems/MovementSystem";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { layer, maskOf } from "../src/physics/collision/CollisionTypes";

describe("AsteroidsHeadless Integration Test", () => {
  let world: World<CoreComponentRegistry>;
  let movementSystem: MovementSystem;
  let collisionSystem: CollisionSystem2D;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    movementSystem = new MovementSystem();
    collisionSystem = new CollisionSystem2D();
  });

  it("debería mover una entidad con velocidad de manera determinista tras X ticks", () => {
    const entity = world.createEntity();

    world.addComponent(entity, {
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

    world.addComponent(entity, {
      type: "Velocity",
      vx: 5,
      vy: -10,
      angularVelocity: Math.PI / 4,
    });

    const deltaTime = 0.1;
    const ticks = 4;

    for (let i = 0; i < ticks; i++) {
      movementSystem.update(world, deltaTime);
    }

    const transform = world.getComponent(entity, "Transform")!;
    expect(transform.x).toBeCloseTo(12, 5);
    expect(transform.y).toBeCloseTo(16, 5);
    expect(transform.rotation).toBeCloseTo(0.1 * Math.PI, 5);
  });

  it("debería lanzar eventos de colisión para entidades con colliders y máscaras compatibles", () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const ASTEROID_LAYER = layer(1);
    const PROJECTILE_LAYER = layer(2);

    world.addComponent(entityA, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    });

    world.addComponent(entityB, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    });

    // Entidad A (Asteroide)
    world.addComponent(entityA, {
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

    world.addComponent(entityA, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 },
      layer: ASTEROID_LAYER,
      mask: maskOf(PROJECTILE_LAYER),
      enabled: true,
      isTrigger: false,
    });

    // Entidad B (Proyectil) - Inicialmente lejos
    world.addComponent(entityB, {
      type: "Transform",
      x: 50,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 50,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });

    world.addComponent(entityB, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 2 },
      layer: PROJECTILE_LAYER,
      mask: maskOf(ASTEROID_LAYER),
      enabled: true,
      isTrigger: false,
    });

    // Registrar un callback en collisionSystem para ver si se ejecuta
    let callbackCalled = false;
    collisionSystem.onCollision(() => {
      callbackCalled = true;
    });

    // Primera actualización: Sin colisión
    collisionSystem.update(world, 0.016);
    expect(callbackCalled).toBe(false);

    // Movemos el Proyectil (Entidad B) para que solape con el Asteroide (Entidad A)
    world.mutateComponent(entityB, "Transform", (t) => {
      t.x = 8;
      t.worldX = 8; // IMPORTANTE: El BroadPhase y NarrowPhase usan worldX si está definido
    });

    // Segunda actualización: Debe detectar la colisión
    collisionSystem.update(world, 0.016);
    expect(callbackCalled).toBe(true);

    const eventsA1 = world.getComponent(entityA, "CollisionEvents")!;
    const eventsB1 = world.getComponent(entityB, "CollisionEvents")!;

    expect(eventsA1.collisions.length).toBe(1);
    expect(eventsB1.collisions.length).toBe(1);

    expect(eventsA1.collisions[0].otherEntity).toBe(entityB);
    expect(eventsB1.collisions[0].otherEntity).toBe(entityA);

    expect(eventsA1.collisions[0].normalX).toBeCloseTo(1, 4);
    expect(eventsA1.collisions[0].normalY).toBeCloseTo(0, 4);
    expect(eventsB1.collisions[0].normalX).toBeCloseTo(-1, 4);
    expect(eventsB1.collisions[0].normalY).toBeCloseTo(0, 4);

    expect(eventsA1.collisions[0].depth).toBeCloseTo(4, 4);
    expect(eventsB1.collisions[0].depth).toBeCloseTo(4, 4);
  });
});

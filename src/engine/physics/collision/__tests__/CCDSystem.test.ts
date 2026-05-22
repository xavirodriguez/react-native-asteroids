import { World } from "../../../core/World";
import { CCDSystem } from "../CCDSystem";
import {
  TransformComponent, VelocityComponent, Collider2DComponent,
  ContinuousColliderComponent, CollisionEventsComponent
} from "../../../types/EngineTypes";

describe("CCDSystem - Raycast Mode", () => {
  let world: World;
  let ccdSystem: CCDSystem;

  beforeEach(() => {
    world = new World();
    ccdSystem = new CCDSystem();
  });

  test("Fast bullet should hit obstacle via CCD even if it would tunnel discretely", () => {
    // 1. Crear Obstáculo (Círculo estático en x=100)
    const obstacle = world.createEntity();
    world.addComponent(obstacle, { type: "Transform", x: 100, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(obstacle, {
      type: "Collider2D",
      shape: { type: "circle", radius: 20 },
      offsetX: 0, offsetY: 0,
      layer: 1, mask: 1,
      enabled: true, isTrigger: false
    } as Collider2DComponent);
    world.addComponent(obstacle, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);

    // 2. Crear Bala Rápida (comienza en x=50, velocidad=6000 px/s, dt=16.6ms -> recorre 100px)
    // En un solo frame saltaría de x=50 a x=150, atravesando el círculo que está en x=100 (radio 20, cubriendo 80 a 120).
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "Transform", x: 50, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(bullet, { type: "Velocity", dx: 6000, dy: 0 } as VelocityComponent);
    world.addComponent(bullet, {
      type: "Collider2D",
      shape: { type: "circle", radius: 2 },
      offsetX: 0, offsetY: 0,
      layer: 1, mask: 1,
      enabled: true, isTrigger: false
    } as Collider2DComponent);
    world.addComponent(bullet, {
      type: "ContinuousCollider",
      enabled: true,
      mode: "raycast",
      velocityThreshold: 100
    } as ContinuousColliderComponent);
    world.addComponent(bullet, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);

    // Ejecutar CCD
    ccdSystem.update(world, 16.6);

    // Verificar impacto
    const bulletTrans = world.getComponent<TransformComponent>(bullet, "Transform")!;
    const bulletEvents = world.getComponent<CollisionEventsComponent>(bullet, "CollisionEvents")!;

    // La bala debe haberse detenido cerca del borde del obstáculo (x=100 - radio 20 = 80)
    expect(bulletTrans.x).toBeLessThan(85);
    expect(bulletTrans.x).toBeGreaterThan(75);

    // Debe haber un evento de colisión registrado
    expect(bulletEvents.collisions.length).toBe(1);
    expect(bulletEvents.collisions[0].otherEntity).toBe(obstacle);
  });

  test("Swept mode should detect collision for larger fast objects", () => {
    const obstacle = world.createEntity();
    world.addComponent(obstacle, { type: "Transform", x: 200, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(obstacle, {
      type: "Collider2D",
      shape: { type: "circle", radius: 50 },
      offsetX: 0, offsetY: 0,
      layer: 1, mask: 1,
      enabled: true, isTrigger: false
    } as Collider2DComponent);

    const ship = world.createEntity();
    world.addComponent(ship, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(ship, { type: "Velocity", dx: 10000, dy: 0 } as VelocityComponent);
    world.addComponent(ship, {
      type: "Collider2D",
      shape: { type: "circle", radius: 20 },
      offsetX: 0, offsetY: 0,
      layer: 1, mask: 1,
      enabled: true, isTrigger: false
    } as Collider2DComponent);
    world.addComponent(ship, {
      type: "ContinuousCollider",
      enabled: true,
      mode: "swept",
      velocityThreshold: 100
    } as ContinuousColliderComponent);
    world.addComponent(ship, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);

    ccdSystem.update(world, 16.6); // Mueve ~166px. Comienza en 0, terminaría en 166. Obstáculo está en 200.
    // Con radio 20 + 50 = 70. x=200-70 = 130 es el punto de impacto.

    const shipTrans = world.getComponent<TransformComponent>(ship, "Transform")!;
    expect(shipTrans.x).toBeGreaterThan(120);
    expect(shipTrans.x).toBeLessThan(140);

    const shipEvents = world.getComponent<CollisionEventsComponent>(ship, "CollisionEvents")!;
    expect(shipEvents.collisions.length).toBe(1);
  });
});

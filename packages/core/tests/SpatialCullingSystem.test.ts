import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { SpatialCullingSystem } from "../src/systems/SpatialCullingSystem";
import { MovementSystem } from "../src/physics/systems/MovementSystem";
import { FrictionSystem } from "../src/physics/systems/FrictionSystem";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { ShapeType } from "../src/physics/shapes/Shapes";

describe("SpatialCullingSystem Tests", () => {
  let world: World<CoreComponentRegistry>;
  let cullingSystem: SpatialCullingSystem;
  let movementSystem: MovementSystem;
  let frictionSystem: FrictionSystem;
  let collisionSystem: CollisionSystem2D;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    // Set screen size
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    cullingSystem = new SpatialCullingSystem({ margin: 100, enabled: true });
    movementSystem = new MovementSystem();
    frictionSystem = new FrictionSystem();
    collisionSystem = new CollisionSystem2D();
  });

  it("debería incluir entidades dentro del viewport y cullar entidades fuera", () => {
    // Entidad 1: Dentro del viewport (x: 100, y: 100)
    const entityInside = world.createEntity();
    world.addComponent(entityInside, {
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

    // Entidad 2: Fuera del viewport (x: 1200, y: 1200) - Límite de viewport + margin es 800+100 = 900
    const entityOutside = world.createEntity();
    world.addComponent(entityOutside, {
      type: "Transform",
      x: 1200,
      y: 1200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 1200,
      worldY: 1200,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });

    cullingSystem.update(world, 0.016);

    const candidates = world.getResource<number[]>("SpatialCullingCandidates");
    expect(candidates).toBeDefined();
    expect(candidates).toContain(entityInside);
    expect(candidates).not.toContain(entityOutside);
  });

  it("debería excluir del culling (nunca cullar) a entidades jugador / LocalPlayer", () => {
    // Entidad jugador colocada lejos fuera del viewport
    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 2000,
      y: 2000,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 2000,
      worldY: 2000,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    // Añadimos tag de LocalPlayer
    world.addComponent(player, { type: "Tag", tags: ["LocalPlayer"] } as any);

    cullingSystem.update(world, 0.016);

    const candidates = world.getResource<number[]>("SpatialCullingCandidates");
    expect(candidates).toContain(player);
  });

  it("debería permitir desactivar el culling espacial y limpiar el recurso", () => {
    const entityInside = world.createEntity();
    world.addComponent(entityInside, {
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

    cullingSystem.update(world, 0.016);
    expect(world.getResource("SpatialCullingCandidates")).toBeDefined();

    // Desactivar culling
    cullingSystem.setEnabled(false);
    cullingSystem.update(world, 0.016);

    expect(world.getResource("SpatialCullingCandidates")).toBeUndefined();
  });

  it("debería optimizar MovementSystem y no mover entidades fuera del viewport culled", () => {
    const inside = world.createEntity();
    world.addComponent(inside, {
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
    world.addComponent(inside, {
      type: "Velocity",
      vx: 100,
      vy: 100,
      angularVelocity: 0,
    });

    const outside = world.createEntity();
    world.addComponent(outside, {
      type: "Transform",
      x: 1500,
      y: 1500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 1500,
      worldY: 1500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(outside, {
      type: "Velocity",
      vx: 100,
      vy: 100,
      angularVelocity: 0,
    });

    // 1. Ejecutar culling
    cullingSystem.update(world, 0.016);

    // 2. Ejecutar movimiento
    movementSystem.update(world, 1.0); // 1 segundo de deltaTime

    const tInside = world.getComponent(inside, "Transform")!;
    const tOutside = world.getComponent(outside, "Transform")!;

    // La entidad de adentro debe haberse movido
    expect(tInside.x).toBe(200);
    expect(tInside.y).toBe(200);

    // La entidad de afuera debe haber permanecido estática debido al culling
    expect(tOutside.x).toBe(1500);
    expect(tOutside.y).toBe(1500);
  });

  it("debería optimizar CollisionSystem2D y no generar colisiones para entidades fuera del viewport", () => {
    // Dos entidades fuera del viewport que se solapan
    const entA = world.createEntity();
    world.addComponent(entA, {
      type: "Transform",
      x: 1500,
      y: 1500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 1500,
      worldY: 1500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(entA, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 20 },
      layer: 1,
      mask: 1,
      enabled: true,
      isTrigger: false,
    });
    world.addComponent(entA, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    });

    const entB = world.createEntity();
    world.addComponent(entB, {
      type: "Transform",
      x: 1510,
      y: 1500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 1510,
      worldY: 1500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(entB, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 20 },
      layer: 1,
      mask: 1,
      enabled: true,
      isTrigger: false,
    });
    world.addComponent(entB, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    });

    // 1. Ejecutar culling
    cullingSystem.update(world, 0.016);

    // 2. Ejecutar colisiones
    collisionSystem.update(world, 0.016);

    const eventsA = world.getComponent(entA, "CollisionEvents")!;
    const eventsB = world.getComponent(entB, "CollisionEvents")!;

    // A pesar de solaparse físicamente, no deben haber colisionado porque fueron culled!
    expect(eventsA.collisions.length).toBe(0);
    expect(eventsB.collisions.length).toBe(0);
  });
});

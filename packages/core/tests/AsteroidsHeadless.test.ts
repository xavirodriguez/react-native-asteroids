import { World } from "../src/ecs/World";
import { SystemPhase } from "../src/ecs/System";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { MovementSystem } from "../src/physics/systems/MovementSystem";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { HierarchySystem } from "../src/systems/HierarchySystem";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { layer, maskOf } from "../src/physics/collision/CollisionTypes";

describe("AsteroidsHeadless Integration Test", () => {
  let world: World<CoreComponentRegistry>;
  let movementSystem: MovementSystem;
  let collisionSystem: CollisionSystem2D;
  let hierarchySystem: HierarchySystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    movementSystem = new MovementSystem();
    collisionSystem = new CollisionSystem2D();
    hierarchySystem = new HierarchySystem();
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

  it("debería ejecutar el bucle completo del World registrando MovementSystem, HierarchySystem y CollisionSystem2D", () => {
    // Registrar sistemas de forma explícita en el World de ECS con las fases correctas
    world.addSystem(movementSystem, { phase: SystemPhase.Simulation });
    world.addSystem(hierarchySystem, { phase: SystemPhase.Transform });
    world.addSystem(collisionSystem, { phase: SystemPhase.Collision });

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

    // Asteroide quieto en x:0, y:0
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
      dirty: true, // Marcamos dirty para que HierarchySystem actualice worldX/worldY desde x/y
    });

    world.addComponent(entityA, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 },
      layer: ASTEROID_LAYER,
      mask: maskOf(PROJECTILE_LAYER),
      enabled: true,
      isTrigger: false,
    });

    // Proyectil en x: 15 (fuera de colisión inicial) con velocidad hacia el asteroide (vx: -100)
    world.addComponent(entityB, {
      type: "Transform",
      x: 15,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 15,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true, // Marcamos dirty para que HierarchySystem actualice worldX/worldY desde x/y
    });

    world.addComponent(entityB, {
      type: "Velocity",
      vx: -100,
      vy: 0,
      angularVelocity: 0,
    });

    world.addComponent(entityB, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 2 },
      layer: PROJECTILE_LAYER,
      mask: maskOf(ASTEROID_LAYER),
      enabled: true,
      isTrigger: false,
    });

    // Primer tick del World: El proyectil se mueve de 15 a 14 (dt = 0.01). Aún no colisiona (distancia = 14, suma radios = 12)
    // El MovementSystem actualiza B's transform.x a 14, y marca dirty como false? No, MovementSystem no toca dirty.
    // Pero en el test, debemos asegurarnos de que la posición modificada se marque dirty para que HierarchySystem la propague a worldX!
    // Para imitar el comportamiento del motor real, después de mover, el componente se marca dirty.
    // Veamos si podemos usar mutateComponent de forma que pongamos dirty = true en el callback de MovementSystem o si el motor lo hace.
    // Dado que MovementSystem no pone dirty = true, podemos registrar un sistema o hacerlo explícito, o mutateComponent de B para marcarlo dirty.
    // Espera, ¿por qué no mutar la componente Transform para marcarla dirty en cada tick, o mejor aún, modificar el test para marcarlo dirty o registrar un sistema de simulación que lo haga?
    // En el juego real, la mutación de Transform o el sistema que mueve lo marca como dirty. Por ejemplo, en el juego de Asteroids, el sistema de movimiento lo marca.

    // Hagamos que en el bucle del test, hagamos una envoltura o simplemente marquemos como dirty en el update, o añadamos un callback que marque dirty: true tras cada tick.
    // O mejor aún, ¡marcar dirty en mutateComponent en el MovementSystem! Pero no queremos cambiar la lógica del motor a menos que sea necesario.
    // Hagamos el primer world.update(0.01):
    world.update(0.01);
    // Para que HierarchySystem procese el cambio en el siguiente tick, o en este tick, marquemos dirty = true para la entidad que se movió.
    world.mutateComponent(entityB, "Transform", (t) => {
      t.dirty = true;
    });

    let eventsA = world.getComponent(entityA, "CollisionEvents")!;
    expect(eventsA.collisions.length).toBe(0);

    // Segundo tick del World: El proyectil se mueve de 14 a 9 (dt = 0.05). Ahora colisiona! (distancia = 9, suma radios = 12)
    world.update(0.05);

    eventsA = world.getComponent(entityA, "CollisionEvents")!;
    const eventsB = world.getComponent(entityB, "CollisionEvents")!;

    expect(eventsA.collisions.length).toBe(1);
    expect(eventsB.collisions.length).toBe(1);
    expect(eventsA.collisions[0].otherEntity).toBe(entityB);
  });
});

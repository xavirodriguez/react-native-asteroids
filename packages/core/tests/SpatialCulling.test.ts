import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { SpatialCullingSystem } from "../src/systems/SpatialCullingSystem";
import { MovementSystem } from "../src/physics/systems/MovementSystem";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { layer, maskOf } from "../src/physics/collision/CollisionTypes";

describe("Spatial Culling System Tests", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  describe("Viewport Calculation", () => {
    it("debería retornar el viewport por defecto usando ScreenConfig si no hay cámara", () => {
      world.setResource("ScreenConfig", { width: 1024, height: 768 });
      const viewport = SpatialCullingSystem.getViewport(world);

      expect(viewport.minX).toBe(0);
      expect(viewport.minY).toBe(0);
      expect(viewport.maxX).toBe(1024);
      expect(viewport.maxY).toBe(768);
    });

    it("debería calcular el viewport basándose en la Camera2D principal y zoom", () => {
      world.setResource("ScreenConfig", { width: 800, height: 600 });

      const cameraEntity = world.createEntity();
      world.addComponent(cameraEntity, {
        type: "Camera2D",
        x: 100,
        y: 200,
        zoom: 2,
        targetX: 100,
        targetY: 200,
        isMain: true,
      });

      const viewport = SpatialCullingSystem.getViewport(world);

      expect(viewport.minX).toBe(100);
      expect(viewport.minY).toBe(200);
      expect(viewport.maxX).toBe(100 + 800 / 2);
      expect(viewport.maxY).toBe(200 + 600 / 2);
    });
  });

  describe("Entity Filtering", () => {
    it("debería clasificar correctamente entidades dentro y fuera del viewport", () => {
      world.setResource("ScreenConfig", { width: 800, height: 600 });

      const entityInside = world.createEntity();
      world.addComponent(entityInside, {
        type: "Transform",
        x: 400,
        y: 300,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 400,
        worldY: 300,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });

      const entityOutside = world.createEntity();
      world.addComponent(entityOutside, {
        type: "Transform",
        x: 1000,
        y: 300,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 1000,
        worldY: 300,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });

      const margin = 100;
      expect(SpatialCullingSystem.isEntityInViewport(world, entityInside, margin)).toBe(true);
      expect(SpatialCullingSystem.isEntityInViewport(world, entityOutside, margin)).toBe(false);

      const filtered = SpatialCullingSystem.filterInViewport(world, [entityInside, entityOutside], margin);
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toBe(entityInside);
    });

    it("debería incluir entidades que estén fuera del viewport pero dentro del margen de buffer", () => {
      world.setResource("ScreenConfig", { width: 800, height: 600 });

      const entityInMargin = world.createEntity();
      world.addComponent(entityInMargin, {
        type: "Transform",
        x: 850,
        y: 300,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 850,
        worldY: 300,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });

      const margin = 100;
      expect(SpatialCullingSystem.isEntityInViewport(world, entityInMargin, margin)).toBe(true);
    });
  });

  describe("System Integration (Culling in Physics & Collision)", () => {
    it("MovementSystem no debería mover entidades fuera del viewport si SpatialCulling está activo", () => {
      world.setResource("ScreenConfig", { width: 800, height: 600 });
      world.setResource("SpatialCullingEnabled", true);
      world.setResource("SpatialCullingMargin", 50);

      const insideEntity = world.createEntity();
      world.addComponent(insideEntity, {
        type: "Transform",
        x: 400,
        y: 300,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 400,
        worldY: 300,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(insideEntity, {
        type: "Velocity",
        vx: 100,
        vy: 0,
        angularVelocity: 0,
      });

      const outsideEntity = world.createEntity();
      world.addComponent(outsideEntity, {
        type: "Transform",
        x: 1000,
        y: 300,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 1000,
        worldY: 300,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(outsideEntity, {
        type: "Velocity",
        vx: 100,
        vy: 0,
        angularVelocity: 0,
      });

      const movementSystem = new MovementSystem();
      movementSystem.update(world, 1.0);

      const insideTransform = world.getComponent(insideEntity, "Transform")!;
      const outsideTransform = world.getComponent(outsideEntity, "Transform")!;

      expect(insideTransform.x).toBe(500);
      expect(outsideTransform.x).toBe(1000);
    });

    it("CollisionSystem2D no debería evaluar colisiones para entidades fuera del viewport si SpatialCulling está activo", () => {
      world.setResource("ScreenConfig", { width: 800, height: 600 });
      world.setResource("SpatialCullingEnabled", true);
      world.setResource("SpatialCullingMargin", 50);

      const ASTEROID_LAYER = layer(1);
      const PROJECTILE_LAYER = layer(2);

      const insideA = world.createEntity();
      const insideB = world.createEntity();

      world.addComponent(insideA, {
        type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: []
      });
      world.addComponent(insideA, {
        type: "Transform", x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 400, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
      });
      world.addComponent(insideA, {
        type: "Collider", shape: { type: ShapeType.Circle, radius: 10 }, layer: ASTEROID_LAYER, mask: maskOf(PROJECTILE_LAYER), enabled: true, isTrigger: false
      });

      world.addComponent(insideB, {
        type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: []
      });
      world.addComponent(insideB, {
        type: "Transform", x: 405, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 405, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
      });
      world.addComponent(insideB, {
        type: "Collider", shape: { type: ShapeType.Circle, radius: 10 }, layer: PROJECTILE_LAYER, mask: maskOf(ASTEROID_LAYER), enabled: true, isTrigger: false
      });

      const outsideA = world.createEntity();
      const outsideB = world.createEntity();

      world.addComponent(outsideA, {
        type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: []
      });
      world.addComponent(outsideA, {
        type: "Transform", x: 1000, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 1000, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
      });
      world.addComponent(outsideA, {
        type: "Collider", shape: { type: ShapeType.Circle, radius: 10 }, layer: ASTEROID_LAYER, mask: maskOf(PROJECTILE_LAYER), enabled: true, isTrigger: false
      });

      world.addComponent(outsideB, {
        type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: []
      });
      world.addComponent(outsideB, {
        type: "Transform", x: 1005, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 1005, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
      });
      world.addComponent(outsideB, {
        type: "Collider", shape: { type: ShapeType.Circle, radius: 10 }, layer: PROJECTILE_LAYER, mask: maskOf(ASTEROID_LAYER), enabled: true, isTrigger: false
      });

      const collisionSystem = new CollisionSystem2D();
      collisionSystem.update(world, 0.016);

      const insideEventsA = world.getComponent(insideA, "CollisionEvents")!;
      const outsideEventsA = world.getComponent(outsideA, "CollisionEvents")!;

      expect(insideEventsA.collisions.length).toBe(1);
      expect(outsideEventsA.collisions.length).toBe(0);
    });

    it("CollisionSystem2D debería aceptar una lista filtrada de candidatas de forma explícita", () => {
      const ASTEROID_LAYER = layer(1);
      const PROJECTILE_LAYER = layer(2);

      const entityA = world.createEntity();
      const entityB = world.createEntity();

      world.addComponent(entityA, {
        type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: []
      });
      world.addComponent(entityA, {
        type: "Transform", x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 400, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
      });
      world.addComponent(entityA, {
        type: "Collider", shape: { type: ShapeType.Circle, radius: 10 }, layer: ASTEROID_LAYER, mask: maskOf(PROJECTILE_LAYER), enabled: true, isTrigger: false
      });

      world.addComponent(entityB, {
        type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: []
      });
      world.addComponent(entityB, {
        type: "Transform", x: 405, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 405, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
      });
      world.addComponent(entityB, {
        type: "Collider", shape: { type: ShapeType.Circle, radius: 10 }, layer: PROJECTILE_LAYER, mask: maskOf(ASTEROID_LAYER), enabled: true, isTrigger: false
      });

      const collisionSystem = new CollisionSystem2D();

      collisionSystem.update(world, 0.016, [entityA]);
      expect(world.getComponent(entityA, "CollisionEvents")!.collisions.length).toBe(0);

      collisionSystem.update(world, 0.016, [entityA, entityB]);
      expect(world.getComponent(entityA, "CollisionEvents")!.collisions.length).toBe(1);
    });
  });
});

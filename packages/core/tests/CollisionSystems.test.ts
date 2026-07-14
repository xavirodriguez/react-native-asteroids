import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { CollisionSystem2D, CCDSystem } from "../src/physics/collision/CollisionSystems";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { layer, maskOf } from "../src/physics/collision/CollisionTypes";

describe("CollisionSystems (CollisionSystem2D & CCDSystem) Tests", () => {
  let world: World<CoreComponentRegistry>;
  let collisionSystem: CollisionSystem2D;
  let ccdSystem: CCDSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    collisionSystem = new CollisionSystem2D();
    ccdSystem = new CCDSystem();
  });

  describe("Scenario 1: Layer and Mask filtering (shouldCollide)", () => {
    it("debería filtrar colisiones correctamente entre entidades de juegos diferentes u objetos no compatibles", () => {
      const ASTEROID_LAYER = layer(1);
      const PROJECTILE_LAYER = layer(2);
      const PONG_BALL_LAYER = layer(3);
      const PONG_PADDLE_LAYER = layer(4);

      // Entidad A (Asteroide)
      const asteroid = world.createEntity();
      world.addComponent(asteroid, {
        type: "Transform",
        x: 10,
        y: 10,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 10,
        worldY: 10,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(asteroid, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 10 },
        layer: ASTEROID_LAYER,
        mask: maskOf(PROJECTILE_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(asteroid, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Entidad B (Proyectil de Asteroids) - Solapa con el Asteroide físicamente
      const projectile = world.createEntity();
      world.addComponent(projectile, {
        type: "Transform",
        x: 12,
        y: 10,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 12,
        worldY: 10,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(projectile, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 2 },
        layer: PROJECTILE_LAYER,
        mask: maskOf(ASTEROID_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(projectile, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Entidad C (Pelota de Pong) - Solapa físicamente con el Asteroide en la misma posición, pero de distinto juego/capas
      const pongBall = world.createEntity();
      world.addComponent(pongBall, {
        type: "Transform",
        x: 10,
        y: 10,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 10,
        worldY: 10,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(pongBall, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 5 },
        layer: PONG_BALL_LAYER,
        mask: maskOf(PONG_PADDLE_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(pongBall, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Ejecutar actualización de colisiones
      collisionSystem.update(world, 0.016);

      const asteroidEvents = world.getComponent(asteroid, "CollisionEvents")!;
      const projectileEvents = world.getComponent(projectile, "CollisionEvents")!;
      const pongBallEvents = world.getComponent(pongBall, "CollisionEvents")!;

      // Asteroide y Proyectil deben haber colisionado entre sí
      expect(asteroidEvents.collisions.length).toBe(1);
      expect(asteroidEvents.collisions[0].otherEntity).toBe(projectile);

      expect(projectileEvents.collisions.length).toBe(1);
      expect(projectileEvents.collisions[0].otherEntity).toBe(asteroid);

      // La pelota de Pong, a pesar de estar físicamente encima del asteroide, NO debe colisionar con él debido al filtrado de capas/máscaras
      expect(pongBallEvents.collisions.length).toBe(0);
      const collisionWithPong = asteroidEvents.collisions.find(c => c.otherEntity === pongBall);
      expect(collisionWithPong).toBeUndefined();
    });
  });

  describe("Scenario 2: CCDSystem (Continuous Collision Detection) & Anti-Tunneling", () => {
    it("debería detectar la colisión de un proyectil muy rápido contra una pared delgada evitando el tunneling", () => {
      const PROJECTILE_LAYER = layer(1);
      const WALL_LAYER = layer(2);

      // Crear un proyectil súper rápido
      const fastProjectile = world.createEntity();
      world.addComponent(fastProjectile, {
        type: "Transform",
        x: 0,
        y: 10,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 10,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(fastProjectile, {
        type: "Velocity",
        vx: 200, // Se mueve 200 unidades por segundo
        vy: 0,
        angularVelocity: 0,
      });
      world.addComponent(fastProjectile, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 1 },
        layer: PROJECTILE_LAYER,
        mask: maskOf(WALL_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(fastProjectile, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Crear una pared muy delgada en el camino (x = 50)
      const thinWall = world.createEntity();
      world.addComponent(thinWall, {
        type: "Transform",
        x: 50,
        y: 10,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 50,
        worldY: 10,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(thinWall, {
        type: "Collider",
        shape: { type: ShapeType.Box, width: 2, height: 100 }, // Pared vertical de ancho 2
        layer: WALL_LAYER,
        mask: maskOf(PROJECTILE_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(thinWall, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Simulamos un único tick de tiempo grande (deltaTime = 0.5)
      // En un solo tick, el proyectil saltaría de x = 0 a x = 100 (saltándose la pared en x = 50)
      const deltaTime = 0.5;

      // Actualizar CCD System
      ccdSystem.update(world, deltaTime);

      const projectileEvents = world.getComponent(fastProjectile, "CollisionEvents")!;

      // El CCD debe detectar el barrido y generar un evento de colisión con la pared
      expect(projectileEvents.collisions.length).toBe(1);
      expect(projectileEvents.collisions[0].otherEntity).toBe(thinWall);
    });

    it("debería detectar la colisión de un proyectil diagonal muy rápido contra un obstáculo circular delgado evitando el tunneling", () => {
      const PROJECTILE_LAYER = layer(1);
      const OBSTACLE_LAYER = layer(2);

      // Crear un proyectil súper rápido viajando en diagonal (vx: 150, vy: 150)
      const fastProjectile = world.createEntity();
      world.addComponent(fastProjectile, {
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
      world.addComponent(fastProjectile, {
        type: "Velocity",
        vx: 150,
        vy: 150,
        angularVelocity: 0,
      });
      world.addComponent(fastProjectile, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 1 },
        layer: PROJECTILE_LAYER,
        mask: maskOf(OBSTACLE_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(fastProjectile, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Obstáculo circular en la trayectoria diagonal (en x: 50, y: 50)
      const circleObstacle = world.createEntity();
      world.addComponent(circleObstacle, {
        type: "Transform",
        x: 50,
        y: 50,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 50,
        worldY: 50,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false,
      });
      world.addComponent(circleObstacle, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 3 }, // Radio delgado de 3
        layer: OBSTACLE_LAYER,
        mask: maskOf(PROJECTILE_LAYER),
        enabled: true,
        isTrigger: false,
      });
      world.addComponent(circleObstacle, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: [],
      });

      // Un solo tick de tiempo (deltaTime = 0.5)
      // El proyectil saltaría de (0,0) a (75,75), cruzando (50,50) en el proceso
      const deltaTime = 0.5;

      ccdSystem.update(world, deltaTime);

      const projectileEvents = world.getComponent(fastProjectile, "CollisionEvents")!;

      expect(projectileEvents.collisions.length).toBe(1);
      expect(projectileEvents.collisions[0].otherEntity).toBe(circleObstacle);
    });

    it("debería verificar que shouldCollide filtre capas y máscaras correctamente", () => {
      const ASTEROID_LAYER = layer(1);
      const PROJECTILE_LAYER = layer(2);
      const PONG_BALL_LAYER = layer(3);

      const systemPrivate = collisionSystem as any;
      // Capas compatibles (Asteroid & Projectile)
      // Asteroid tiene layer ASTEROID_LAYER y máscara de PROJECTILE_LAYER. Projectile tiene layer PROJECTILE_LAYER y máscara de ASTEROID_LAYER.
      expect(systemPrivate.shouldCollide(ASTEROID_LAYER, maskOf(ASTEROID_LAYER), PROJECTILE_LAYER, maskOf(PROJECTILE_LAYER))).toBe(true);

      // Capas incompatibles (Asteroid & PongBall)
      expect(systemPrivate.shouldCollide(ASTEROID_LAYER, maskOf(PROJECTILE_LAYER), PONG_BALL_LAYER, maskOf(PROJECTILE_LAYER))).toBe(false);
    });
  });
});

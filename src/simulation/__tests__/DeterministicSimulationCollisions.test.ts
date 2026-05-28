import { World } from "../../engine/core/World";
import { CollisionSystem2D } from "../../engine/physics/collision/CollisionSystem2D";
import { SpatialGrid } from "../../engine/physics/utils/SpatialGrid";
import { AsteroidsGame } from "../../games/asteroids/AsteroidsGame";
import { Entity, TransformComponent, Collider2DComponent, CollisionEventsComponent } from "../../engine/types/EngineTypes";
import { AsteroidComponent, BulletComponent, GameStateComponent } from "../../engine/core/CoreComponents";

describe("Asteroids ECS - SpatialGrid Collisions", () => {
  let game: AsteroidsGame;
  let world: World;
  let spatialGrid: SpatialGrid;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();

    // Clear initial entities
    const entities = world.entities;
    entities.forEach(e => world.removeEntity(e));

    spatialGrid = new SpatialGrid(100);
    world.setResource("SpatialGrid", spatialGrid);
    world.setResource("ScreenConfig", { width: 800, height: 600 });
    const asteroidsConfig = await import("../../games/asteroids/config/asteroids.json");
    world.setResource("GameConfig", asteroidsConfig.default);

    const colSys = world.systemsList.find(s => s instanceof CollisionSystem2D) as CollisionSystem2D;
    if (colSys) {
      colSys.useSpatialHash(100);
    }

    world.createEntity(); // Entity 0?
    const gameStateEntity = world.createEntity();
    world.addComponent(gameStateEntity, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      asteroidsRemaining: 0,
      isGameOver: false,
      comboCount: 0,
      comboMultiplier: 1,
      lastBulletHit: false,
      serverTick: 0,
    } as unknown as GameStateComponent);
  });

  function createAsteroid(x: number, y: number): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Asteroid", size: "large", splitsInto: ["medium_asteroid"], splitCount: 2 } as AsteroidComponent);
    world.addComponent(entity, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: y, dirty: true } as TransformComponent);
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "circle", radius: 20 },
      layer: 1, // ASTEROID_LAYER
      mask: 2,   // BULLET_LAYER
      enabled: true,
      offsetX: 0,
      offsetY: 0
    } as Collider2DComponent);
    world.addComponent(entity, { type: "SpatialNode", active: true, lastCellKeys: [] } as unknown);
    world.addComponent(entity, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);
    return entity;
  }

  function createBullet(x: number, y: number): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Bullet" } as BulletComponent);
    world.addComponent(entity, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: y, dirty: true } as TransformComponent);
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "circle", radius: 2 },
      layer: 2, // BULLET_LAYER
      mask: 1,   // ASTEROID_LAYER
      enabled: true,
      offsetX: 0,
      offsetY: 0
    } as Collider2DComponent);
    world.addComponent(entity, { type: "SpatialNode", active: true, lastCellKeys: [] } as unknown);
    world.addComponent(entity, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);
    return entity;
  }

  it("should detect collision when bullet and asteroid are in the same cell", () => {
    const asteroid = createAsteroid(50, 50);
    const bullet = createBullet(55, 55);

    game.runSimulationStep(16, false);
    world.flush();
    game.runSimulationStep(16, false); // Step 2: Resolve collisions
    world.flush();

    expect(world.hasEntity(bullet)).toBe(false);
    expect(world.hasEntity(asteroid)).toBe(false);
  });

  it("should detect collision when bullet and asteroid are in adjacent cells", () => {
    // Cell 0,0 is [0, 100), Cell 1,0 is [100, 200)
    const asteroid = createAsteroid(95, 50);
    const bullet = createBullet(105, 50); // Cell 1,0

    game.runSimulationStep(16, false); // Step 1: Detect collisions
    world.flush();
    game.runSimulationStep(16, false); // Step 2: Resolve collisions
    world.flush();

    expect(world.hasEntity(bullet)).toBe(false);
    expect(world.hasEntity(asteroid)).toBe(false);
  });

  it("should NOT detect collision when bullet and asteroid are far apart", () => {
    const asteroid = createAsteroid(50, 50);
    const bullet = createBullet(250, 250);

    game.runSimulationStep(16, false);
    world.flush();

    expect(world.hasEntity(bullet)).toBe(true);
    expect(world.hasEntity(asteroid)).toBe(true);
  });
});

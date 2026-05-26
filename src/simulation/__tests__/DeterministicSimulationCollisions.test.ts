import { World } from "../../engine/core/World";
import { SpatialGrid } from "../../engine/physics/utils/SpatialGrid";
import { AsteroidsGame } from "../../games/asteroids/AsteroidsGame";
import { Entity, TransformComponent, Collider2DComponent } from "../../engine/types/EngineTypes";
import { AsteroidComponent } from "../../games/asteroids/types/AsteroidTypes";

describe("Asteroids ECS - SpatialGrid Collisions", () => {
  let game: AsteroidsGame;
  let world: World;
  let spatialGrid: SpatialGrid;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();

    // Clear initial entities
    const entities = world.query("Transform");
    entities.forEach(e => world.removeEntity(e));

    spatialGrid = new SpatialGrid(100);
    world.setResource("SpatialGrid", spatialGrid);
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    const { createGameState } = require("../../games/asteroids/EntityFactory");
    createGameState({ world });
  });

  function createAsteroid(x: number, y: number): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Asteroid", size: "large" } as AsteroidComponent);
    world.addComponent(entity, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, dirty: true } as TransformComponent);
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "circle", radius: 20 },
      layer: 1, // ASTEROID_LAYER
      mask: 2   // BULLET_LAYER
    } as Collider2DComponent);
    world.addComponent(entity, { type: "SpatialNode", active: true, lastCellKeys: [] } as unknown);
    return entity;
  }

  function createBullet(x: number, y: number): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Bullet" } as unknown);
    world.addComponent(entity, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, dirty: true } as TransformComponent);
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "circle", radius: 2 },
      layer: 2, // BULLET_LAYER
      mask: 1   // ASTEROID_LAYER
    } as Collider2DComponent);
    world.addComponent(entity, { type: "SpatialNode", active: true, lastCellKeys: [] } as unknown);
    return entity;
  }

  it("should detect collision when bullet and asteroid are in the same cell", () => {
    const asteroid = createAsteroid(50, 50);
    const bullet = createBullet(55, 55);

    game.runSimulationStep(16, false);
    world.flush();

    expect(world.hasEntity(bullet)).toBe(false);
    expect(world.hasEntity(asteroid)).toBe(false);
  });

  it("should detect collision when bullet and asteroid are in adjacent cells", () => {
    // Cell 0,0 is [0, 100), Cell 1,0 is [100, 200)
    const asteroid = createAsteroid(95, 50);
    const bullet = createBullet(105, 50); // Cell 1,0

    game.runSimulationStep(16, false);
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

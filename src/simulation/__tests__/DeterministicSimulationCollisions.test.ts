import { World } from "../../engine/core/World";
import { SpatialGrid } from "../../engine/physics/utils/SpatialGrid";
import { DeterministicSimulation } from "../DeterministicSimulation";
import { Entity, TransformComponent, Collider2DComponent } from "../../engine/types/EngineTypes";
import { AsteroidComponent, GameStateComponent } from "../../games/asteroids/types/AsteroidTypes";

describe("DeterministicSimulation - SpatialGrid Collisions", () => {
  let world: World;
  let spatialGrid: SpatialGrid;

  beforeEach(() => {
    world = new World();
    spatialGrid = new SpatialGrid(100);
    world.setResource("SpatialGrid", spatialGrid);
    world.addComponent(world.createEntity(), { type: "GameState", score: 0 } as GameStateComponent);
  });

  function createAsteroid(x: number, y: number): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Asteroid", size: "large" } as AsteroidComponent);
    world.addComponent(entity, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "circle", radius: 20 },
      layer: 0,
      mask: 0
    } as Collider2DComponent);
    return entity;
  }

  function createBullet(x: number, y: number): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Bullet" } as any);
    world.addComponent(entity, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "circle", radius: 2 },
      layer: 0,
      mask: 0
    } as Collider2DComponent);
    return entity;
  }

  it("should detect collision when bullet and asteroid are in the same cell", () => {
    const asteroid = createAsteroid(50, 50);
    const bullet = createBullet(55, 55);

    DeterministicSimulation.update(world, 16, { isResimulating: false });
    world.flush();

    expect(world.hasEntity(bullet)).toBe(false);
    expect(world.hasEntity(asteroid)).toBe(false);
  });

  it("should detect collision when bullet and asteroid are in adjacent cells", () => {
    // Cell 0,0 is [0, 100), Cell 1,0 is [100, 200)
    // The asteroid is at 95, its radius is 20. So its AABB is [75, 115].
    // It should be inserted into BOTH cell 0,0 and cell 1,0.
    const asteroid = createAsteroid(95, 50);
    const bullet = createBullet(105, 50); // Cell 1,0

    DeterministicSimulation.update(world, 16, { isResimulating: false });
    world.flush();

    expect(world.hasEntity(bullet)).toBe(false);
    expect(world.hasEntity(asteroid)).toBe(false);
  });

  it("should NOT detect collision when bullet and asteroid are far apart", () => {
    const asteroid = createAsteroid(50, 50);
    const bullet = createBullet(250, 250);

    DeterministicSimulation.update(world, 16, { isResimulating: false });
    world.flush();

    expect(world.hasEntity(bullet)).toBe(true);
    expect(world.hasEntity(asteroid)).toBe(true);
  });
});

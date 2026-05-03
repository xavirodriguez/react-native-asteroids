import { World } from "../../core/World";
import { InterestManagerSystem } from "../InterestManagerSystem";
import { TransformComponent } from "../../core/CoreComponents";
import { SpatialGrid } from "../../physics/utils/SpatialGrid";
import { ShipComponent } from "../../../games/asteroids/types/AsteroidTypes";
import { InterestedEntity } from "../types/ReplicationTypes";

describe("InterestManagerSystem", () => {
  let world: World;
  let system: InterestManagerSystem;

  beforeEach(() => {
    world = new World();
    system = new InterestManagerSystem();
    world.setResource("SpatialGrid", new SpatialGrid(100));
  });

  test("should identify entities within interest radii", () => {
    // Player at (0, 0)
    const player = world.createEntity();
    world.addComponent(player, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(player, { type: "Ship", sessionId: "client1" } as ShipComponent);

    // Entity at (100, 0) - Critical (<200)
    const criticalEntity = world.createEntity();
    world.addComponent(criticalEntity, { type: "Transform", x: 100, y: 0 } as TransformComponent);

    // Entity at (400, 0) - High (<500)
    const highEntity = world.createEntity();
    world.addComponent(highEntity, { type: "Transform", x: 400, y: 0 } as TransformComponent);

    // Entity at (800, 0) - Medium (<1000)
    const mediumEntity = world.createEntity();
    world.addComponent(mediumEntity, { type: "Transform", x: 800, y: 0 } as TransformComponent);

    // Entity at (1500, 0) - Low (<2000)
    const lowEntity = world.createEntity();
    world.addComponent(lowEntity, { type: "Transform", x: 1500, y: 0 } as TransformComponent);

    // Entity at (3000, 0) - None
    const farEntity = world.createEntity();
    world.addComponent(farEntity, { type: "Transform", x: 3000, y: 0 } as TransformComponent);

    // Populate SpatialGrid (normally done by another system)
    const grid = world.getResource<SpatialGrid>("SpatialGrid")!;
    const entities = world.query("Transform");
    entities.forEach(id => {
      const t = world.getComponent<TransformComponent>(id, "Transform")!;
      grid.insert(id, { minX: t.x-1, maxX: t.x+1, minY: t.y-1, maxY: t.y+1 });
    });

    system.update(world, 16.66);

    const detailedInterestMap = world.getResource<Map<string, InterestedEntity[]>>("DetailedInterestMap")!;
    const interest = detailedInterestMap.get("client1")!;

    expect(interest).toBeDefined();

    const findById = (id: number) => interest.find(i => i.entityId === id.toString());

    expect(findById(criticalEntity)?.interestLevel).toBe('critical');
    expect(findById(highEntity)?.interestLevel).toBe('high');
    expect(findById(mediumEntity)?.interestLevel).toBe('medium');
    expect(findById(lowEntity)?.interestLevel).toBe('low');
    expect(interest.find(i => i.entityId === farEntity.toString())).toBeUndefined();

    // Self should be critical
    const self = interest.find(i => i.entityId === player.toString());
    expect(self?.interestLevel).toBe('critical');
  });
});

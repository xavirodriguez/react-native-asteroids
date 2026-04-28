import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";
import { SpatialGrid } from "../physics/utils/SpatialGrid";
import { ShipComponent } from "../../games/asteroids/types/AsteroidTypes";

/**
 * System that calculates which entities are "interesting" or relevant for viewers (players).
 *
 * @remarks
 * Primarily used on the server to filter network replication snapshots.
 * It populates the "InterestMap" resource: Map<string, Set<Entity>>.
 */
export class InterestManagementSystem extends System {
  public interestRadius = 800; // Default view distance

  public update(world: World, _deltaTime: number): void {
    const grid = world.getResource<SpatialGrid>("SpatialGrid");
    if (!grid) return;

    // Viewers are entities with a "Ship" component (on server) or "LocalPlayer" (on client)
    // For the server implementation in AsteroidsRoom, they are marked with a sessionId in Ship component.
    const viewers = world.query("Ship");
    const interestMap = new Map<string, Set<Entity>>();

    for (const viewerEntity of viewers) {
      const ship = world.getComponent<ShipComponent>(viewerEntity, "Ship");
      if (!ship || !ship.sessionId) continue;

      const transform = world.getComponent<TransformComponent>(viewerEntity, "Transform");
      if (!transform) continue;

      const sessionId = ship.sessionId;
      const relevantEntities = new Set<Entity>();

      // Define interest AABB around the viewer
      const aabb = {
        minX: transform.x - this.interestRadius,
        maxX: transform.x + this.interestRadius,
        minY: transform.y - this.interestRadius,
        maxY: transform.y + this.interestRadius
      };

      // Query SpatialGrid for nearby entities
      grid.query(aabb, relevantEntities);

      // Ensure the viewer is always relevant to themselves
      relevantEntities.add(viewerEntity);

      interestMap.set(sessionId, relevantEntities);
    }

    world.setResource("InterestMap", interestMap);
  }
}

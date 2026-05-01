/**
 * System that manages network interest and replication filtering.
 *
 * This system determines which entities should be synchronized to which players based
 * on spatial proximity. It optimizes network bandwidth by avoiding updates for
 * entities far away from the player's view.
 *
 * @packageDocumentation
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";
import { SpatialGrid } from "../physics/utils/SpatialGrid";
import { ShipComponent } from "../../games/asteroids/types/AsteroidTypes";

/**
 * Calculates and maintains a map of entities relevant for each viewer.
 */
export class InterestManagementSystem extends System {
  /**
   * Distance in pixels around a player where entities are considered relevant.
   * Default: 800 (approx. one screen size).
   */
  public interestRadius = 800;

  /**
   * Identifies interesting entities for each active session.
   * Results are stored in the "InterestMap" resource.
   */
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

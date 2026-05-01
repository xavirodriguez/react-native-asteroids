import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent } from "../core/CoreComponents";
import { SpatialGrid } from "../physics/utils/SpatialGrid";
import { ShipComponent } from "../../games/asteroids/types/AsteroidTypes";
import { InterestedEntity } from "./types/ReplicationTypes";
import { InterestManager } from "./InterestManager";

/**
 * @responsibility Determine which entities are relevant for each player based on spatial proximity.
 * @remarks
 * This system populates the "InterestMap" resource, which is used by the server to filter network updates.
 * It uses the global SpatialGrid to efficiently query nearby entities.
 *
 * @conceptualRisk [SCALE][MEDIUM] As the number of players increases, querying for each one becomes more expensive.
 */
export class InterestManagerSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const grid = world.getResource<SpatialGrid>("SpatialGrid");
    if (!grid) return;

    // We use the same interest map structure but now with detailed InterestEntity data if needed.
    // For Iteration 2, we'll store Detailed Interest Info in a new resource or update the existing one.
    // The requirement says: InterestedEntity[] { entityId, interestLevel, distance }
    const detailedInterestMap = new Map<string, InterestedEntity[]>();
    const simpleInterestMap = new Map<string, Set<number>>();

    const players = world.query("Ship", "Transform");

    for (const playerEntity of players) {
      const ship = world.getComponent<ShipComponent>(playerEntity, "Ship");
      if (!ship || !ship.sessionId) continue;

      const playerTransform = world.getComponent<TransformComponent>(playerEntity, "Transform")!;
      const sessionId = ship.sessionId;
      const interested: InterestedEntity[] = [];
      const interestedIds = new Set<number>();

      // We use the maximum interest radius to query the grid
      const queryAABB = {
        minX: playerTransform.x - InterestManager.LOW_RADIUS,
        maxX: playerTransform.x + InterestManager.LOW_RADIUS,
        minY: playerTransform.y - InterestManager.LOW_RADIUS,
        maxY: playerTransform.y + InterestManager.LOW_RADIUS,
      };

      const candidates = new Set<number>();
      grid.query(queryAABB, candidates);

      for (const entityId of candidates) {
        const transform = world.getComponent<TransformComponent>(entityId, "Transform");
        if (!transform) continue;

        const dx = transform.x - playerTransform.x;
        const dy = transform.y - playerTransform.y;
        const distanceSq = dx * dx + dy * dy;

        const level = InterestManager.getInterestLevelSq(distanceSq);
        if (level !== 'none') {
          interested.push({
            entityId,
            interestLevel: level,
            distance: Math.sqrt(distanceSq)
          });
          interestedIds.add(entityId);
        }
      }

      // Always include self as critical
      if (!interestedIds.has(playerEntity)) {
          interested.push({
              entityId: playerEntity,
              interestLevel: 'critical',
              distance: 0
          });
          interestedIds.add(playerEntity);
      }

      detailedInterestMap.set(sessionId, interested);
      simpleInterestMap.set(sessionId, interestedIds);
    }

    world.setResource("DetailedInterestMap", detailedInterestMap);
    world.setResource("InterestMap", simpleInterestMap);
  }
}

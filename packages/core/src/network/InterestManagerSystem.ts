import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { TransformComponent, PlayerComponent } from "../ecs/CoreComponents";
import { InterestedEntity } from "./ReplicationTypes";
import { InterestManager } from "./InterestManager";

export class InterestManagerSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const grid = world.getResource<{ query: (aabb: { minX: number, maxX: number, minY: number, maxY: number }, result: Set<number>) => void }>("SpatialGrid");
    if (!grid) return;

    const detailedInterestMap = new Map<string, InterestedEntity[]>();
    const simpleInterestMap = new Map<string, Set<number>>();

    const players = world.query("Player", "Transform");

    for (const playerEntity of players) {
      const player = world.getComponent<PlayerComponent>(playerEntity, "Player");
      if (!player || !player.sessionId) continue;

      const playerTransform = world.getComponent<TransformComponent>(playerEntity, "Transform")!;
      const sessionId = player.sessionId;
      const interested: InterestedEntity[] = [];
      const interestedIds = new Set<number>();

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
            entityId: entityId,
            interestLevel: level,
            distance: Math.sqrt(distanceSq)
          });
          interestedIds.add(entityId);
        }
      }

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

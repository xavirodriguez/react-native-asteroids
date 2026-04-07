import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, ReclaimableComponent } from "../../../engine/types/EngineTypes";
import { GAME_CONFIG } from "../types/SpaceInvadersTypes";

/**
 * System that keeps entities within screen bounds or removes them if they are bullets.
 */
export class BoundarySystem extends System {
  public update(world: World, _deltaTime: number): void {
    // 1. Clamp player position
    const players = world.query("Player", "Transform");
    players.forEach(entity => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      if (pos) {
        const halfWidth = GAME_CONFIG.PLAYER_RENDER_WIDTH / 2;
        if (pos.x < halfWidth) pos.x = halfWidth;
        if (pos.x > GAME_CONFIG.SCREEN_WIDTH - halfWidth) {
          pos.x = GAME_CONFIG.SCREEN_WIDTH - halfWidth;
        }
      }
    });

    // 2. Remove bullets that go off screen
    const bullets = world.query("Transform");
    bullets.forEach(entity => {
      const isPlayerBullet = world.getComponent(entity, "PlayerBullet");
      const isEnemyBullet = world.getComponent(entity, "EnemyBullet");

      if (isPlayerBullet || isEnemyBullet) {
        const pos = world.getComponent<TransformComponent>(entity, "Transform");
        if (pos) {
          if (pos.y < 0 || pos.y > GAME_CONFIG.SCREEN_HEIGHT) {
            const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
            if (reclaimable) {
              reclaimable.onReclaim(world, entity);
            }
            world.removeEntity(entity);
          }
        }
      }
    });
  }
}

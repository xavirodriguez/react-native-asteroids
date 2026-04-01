import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { PositionComponent } from "../../../engine/types/EngineTypes";
import { FormationComponent, InvaderComponent, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { EnemyBulletPool } from "../EntityPool";
import { createEnemyBullet } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";

/**
 * System that manages the movement and firing of the invader formation.
 */
export class SpaceInvadersFormationSystem extends System {
  private enemyBulletPool: EnemyBulletPool;

  constructor(enemyBulletPool: EnemyBulletPool) {
    super();
    this.enemyBulletPool = enemyBulletPool;
  }

  public update(world: World, deltaTime: number): void {
    const formationEntities = world.query("Formation");
    if (formationEntities.length === 0) return;

    const formationEntity = formationEntities[0];
    const formation = world.getComponent<FormationComponent>(formationEntity, "Formation");
    if (!formation) return;

    const invaders = world.query("Invader", "Position");
    if (invaders.length === 0) return;

    // 1. Calculate current speed based on remaining invaders
    const totalInvaders = GAME_CONFIG.INVADER_ROWS * GAME_CONFIG.INVADER_COLS;
    const ratio = 1 - (invaders.length / totalInvaders);
    formation.speed = GAME_CONFIG.INVADER_SPEED_BASE + ratio * (GAME_CONFIG.INVADER_SPEED_MAX - GAME_CONFIG.INVADER_SPEED_BASE);

    // 2. Move formation or handle step down
    let hitEdge = false;
    const margin = 20;

    if (formation.stepDownPending) {
      invaders.forEach(entity => {
        const pos = world.getComponent<PositionComponent>(entity, "Position");
        if (pos) {
          pos.y += formation.descentStep;
        }
      });
      formation.stepDownPending = false;
      formation.direction *= -1; // Invert direction after stepping down
    } else {
      const moveX = formation.direction * formation.speed * (deltaTime / 1000);
      invaders.forEach(entity => {
        const pos = world.getComponent<PositionComponent>(entity, "Position");
        if (pos) {
          pos.x += moveX;
          if (pos.x < margin || pos.x > GAME_CONFIG.SCREEN_WIDTH - margin) {
            hitEdge = true;
          }
        }
      });
    }

    if (hitEdge) {
      formation.stepDownPending = true;
    }

    // 3. Enemy firing logic
    formation.fireCooldownRemaining -= deltaTime;
    if (formation.fireCooldownRemaining <= 0) {
      this.fireFromFormation(world, invaders);
      formation.fireCooldownRemaining = RandomService.nextRange(
        GAME_CONFIG.ENEMY_FIRE_INTERVAL_MIN,
        GAME_CONFIG.ENEMY_FIRE_INTERVAL_MAX
      ) / (1 + ratio); // Faster firing as fewer invaders remain
    }
  }

  private fireFromFormation(world: World, invaderEntities: number[]): void {
    // Group invaders by column and pick the bottom one
    const columns: Map<number, { entity: number, y: number }> = new Map();

    invaderEntities.forEach(entity => {
      const invader = world.getComponent<InvaderComponent>(entity, "Invader");
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      if (invader && pos) {
        const existing = columns.get(invader.col);
        if (!existing || pos.y > existing.y) {
          columns.set(invader.col, { entity, y: pos.y });
        }
      }
    });

    const activeColumns = Array.from(columns.values());
    if (activeColumns.length > 0) {
      const shooter = activeColumns[RandomService.nextInt(0, activeColumns.length)];
      const shooterPos = world.getComponent<PositionComponent>(shooter.entity, "Position");
      if (shooterPos) {
        createEnemyBullet(world, shooterPos.x, shooterPos.y + 15, this.enemyBulletPool);
      }
    }
  }
}

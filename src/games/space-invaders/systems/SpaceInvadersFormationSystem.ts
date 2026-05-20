import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent } from "../../../engine/types/EngineTypes";
import { FormationComponent, InvaderComponent } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { EnemyBulletPool } from "../EntityPool";
import { createEnemyBullet } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";

/**
 * System that manages the movement and firing of the invader formation.
 */
export class SpaceInvadersFormationSystem extends System {
  private enemyBulletPool: EnemyBulletPool;
  private config?: SpaceInvadersConfig;

  constructor(enemyBulletPool: EnemyBulletPool) {
    super();
    this.enemyBulletPool = enemyBulletPool;
  }

  public update(world: World, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const formationEntities = world.query("Formation");
    if (formationEntities.length === 0) return;

    const formationEntity = formationEntities[0];
    const formation = world.getComponent<FormationComponent>(formationEntity, "Formation");
    if (!formation) return;

    const invaders = world.query("Invader", "Transform");
    if (invaders.length === 0) return;

    // 1. Calculate current speed based on remaining invaders
    const totalInvaders = this.config.INVADER_ROWS * this.config.INVADER_COLS;
    const ratio = 1 - (invaders.length / totalInvaders);
    world.mutateComponent<FormationComponent>(formationEntity, "Formation", f => {
      f.speed = this.config!.INVADER_SPEED_BASE + ratio * (this.config!.INVADER_SPEED_MAX - this.config!.INVADER_SPEED_BASE);
    });

    // 2. Move formation or handle step down
    const margin = 20;

    if (formation.stepDownPending) {
      const directionBefore = formation.direction;
      const nextDirection = (directionBefore * -1) as 1 | -1;

      for (const entity of invaders) {
        world.mutateComponent<TransformComponent>(entity, "Transform", pos => {
          pos.y += formation.descentStep;
        });
      }
      world.mutateComponent<FormationComponent>(formationEntity, "Formation", f => {
        f.stepDownPending = false;
        f.direction = nextDirection;
      });
      console.debug("[SpaceInvaders] formation step down", {
        directionBefore,
        directionAfter: nextDirection,
        invaderCount: invaders.length,
      });
    } else {
      const moveX = formation.direction * formation.speed * (deltaTime / 1000);

      // Calculate current min/max bounds before moving
      let minX = Infinity;
      let maxX = -Infinity;
      for (const entity of invaders) {
        const pos = world.getComponent<TransformComponent>(entity, "Transform");
        if (!pos) continue;
        if (pos.x < minX) minX = pos.x;
        if (pos.x > maxX) maxX = pos.x;
      }

      const leftLimit = margin;
      const rightLimit = this.config.SCREEN_WIDTH - margin;

      // Use predictive edge checking considering movement direction
      const willHitRight = formation.direction > 0 && maxX + moveX >= rightLimit;
      const willHitLeft  = formation.direction < 0 && minX + moveX <= leftLimit;

      console.debug("[SpaceInvaders] formation edge check", {
        direction: formation.direction,
        moveX,
        minX,
        maxX,
        leftLimit,
        rightLimit,
        willHitLeft,
        willHitRight,
        stepDownPending: formation.stepDownPending,
      });

      if (willHitRight || willHitLeft) {
        world.mutateComponent<FormationComponent>(formationEntity, "Formation", f => {
          f.stepDownPending = true;
        });
      } else {
        for (const entity of invaders) {
          world.mutateComponent<TransformComponent>(entity, "Transform", pos => {
            pos.x += moveX;
          });
        }
      }
    }

    // 3. Enemy firing logic
    world.mutateComponent<FormationComponent>(formationEntity, "Formation", f => {
      f.fireCooldownRemaining -= deltaTime;
      if (f.fireCooldownRemaining <= 0) {
        this.fireFromFormation(world, invaders);
        f.fireCooldownRemaining = RandomService.getGameplayRandom().nextRange(
          this.config!.ENEMY_FIRE_INTERVAL_MIN,
          this.config!.ENEMY_FIRE_INTERVAL_MAX
        ) / (1 + ratio); // Faster firing as fewer invaders remain
      }
    });
  }

  private fireFromFormation(world: World, invaderEntities: ReadonlyArray<number>): void {
    // Group invaders by column and pick the bottom one
    const columns: Map<number, { entity: number, y: number }> = new Map();

    invaderEntities.forEach(entity => {
      const invader = world.getComponent<InvaderComponent>(entity, "Invader");
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      if (invader && pos) {
        const existing = columns.get(invader.col);
        if (!existing || pos.y > existing.y) {
          columns.set(invader.col, { entity, y: pos.y });
        }
      }
    });

    const activeColumns = Array.from(columns.values());
    if (activeColumns.length > 0) {
      const shooter = activeColumns[RandomService.getGameplayRandom().nextInt(0, activeColumns.length)];
      const shooterPos = world.getComponent<TransformComponent>(shooter.entity, "Transform");
      if (shooterPos) {
        createEnemyBullet(world, shooterPos.x, shooterPos.y + 15, this.enemyBulletPool);
      }
    }
  }
}

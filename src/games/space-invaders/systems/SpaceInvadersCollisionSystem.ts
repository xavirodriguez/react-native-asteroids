import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import {
  PositionComponent,
  ColliderComponent,
  HealthComponent,
  RenderComponent,
  ReclaimableComponent
} from "../../../engine/types/EngineTypes";
import {
  GameStateComponent,
  InvaderComponent,
  ShieldComponent,
  GAME_CONFIG
} from "../types/SpaceInvadersTypes";
import { getGameState } from "../GameUtils";
import { ParticlePool } from "../EntityPool";
import { createParticle } from "../EntityFactory";

/**
 * System that handles all game collisions.
 */
export class SpaceInvadersCollisionSystem extends System {
  private particlePool: ParticlePool;

  constructor(particlePool: ParticlePool) {
    super();
    this.particlePool = particlePool;
  }

  public update(world: World, _deltaTime: number): void {
    const collidables = world.query("Position", "Collider");
    const gameState = getGameState(world);

    if (gameState.isGameOver) return;

    // Standard O(n^2) collision for simplicity, can be optimized later
    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const e1 = collidables[i];
        const e2 = collidables[j];

        if (this.checkCollision(world, e1, e2)) {
          this.handleCollision(world, e1, e2, gameState);
        }
      }
    }

    // Special check: Invaders reaching the bottom
    this.checkInvadersBottom(world, gameState);
  }

  private checkCollision(world: World, e1: number, e2: number): boolean {
    const p1 = world.getComponent<PositionComponent>(e1, "Position");
    const c1 = world.getComponent<ColliderComponent>(e1, "Collider");
    const p2 = world.getComponent<PositionComponent>(e2, "Position");
    const c2 = world.getComponent<ColliderComponent>(e2, "Collider");

    if (!p1 || !c1 || !p2 || !c2) return false;

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = c1.radius + c2.radius;

    return distanceSq < radiusSum * radiusSum;
  }

  private handleCollision(world: World, e1: number, e2: number, gameState: GameStateComponent): void {
    this.matchPair(world, e1, e2, "PlayerBullet", "Invader", (bullet, invader) => {
      const invaderComp = world.getComponent<InvaderComponent>(invader, "Invader");
      if (!invaderComp) return;
      gameState.score += invaderComp.points;

      const pos = world.getComponent<PositionComponent>(invader, "Position");
      if (pos) this.createExplosion(world, pos.x, pos.y, "#FFFFFF");

      this.destroyEntity(world, invader);
      this.reclaimEntity(world, bullet);
    });

    this.matchPair(world, e1, e2, "PlayerBullet", "Shield", (bullet, shield) => {
      this.damageShield(world, shield);
      this.reclaimEntity(world, bullet);
    });

    this.matchPair(world, e1, e2, "EnemyBullet", "Shield", (bullet, shield) => {
      this.damageShield(world, shield);
      this.reclaimEntity(world, bullet);
    });

    this.matchPair(world, e1, e2, "EnemyBullet", "Player", (bullet, player) => {
      const health = world.getComponent<HealthComponent>(player, "Health");
      if (health && health.invulnerableRemaining <= 0) {
        health.current -= 1;
        health.invulnerableRemaining = 1500;

        const render = world.getComponent<RenderComponent>(player, "Render");
        if (render) render.hitFlashFrames = 10;

        gameState.lives = health.current;
        gameState.screenShake = { intensity: 10, duration: 20 };

        if (health.current <= 0) {
          gameState.isGameOver = true;
        }
      }
      this.reclaimEntity(world, bullet);
    });

    this.matchPair(world, e1, e2, "Invader", "Player", (_invader, _player) => {
      gameState.isGameOver = true;
    });

    this.matchPair(world, e1, e2, "Invader", "Shield", (_invader, shield) => {
      this.destroyEntity(world, shield);
    });
  }

  private matchPair(
    world: World,
    e1: number,
    e2: number,
    type1: string,
    type2: string,
    handler: (entity1: number, entity2: number) => void
  ): void {
    const has1 = world.getComponent(e1, type1);
    const has2 = world.getComponent(e2, type2);
    if (has1 && has2) {
      handler(e1, e2);
      return;
    }

    const hasR1 = world.getComponent(e1, type2);
    const hasR2 = world.getComponent(e2, type1);
    if (hasR1 && hasR2) {
      handler(e2, e1);
    }
  }

  private damageShield(world: World, shieldEntity: number): void {
    const shield = world.getComponent<ShieldComponent>(shieldEntity, "Shield");
    if (shield) {
      shield.hp -= 1;
      if (shield.hp <= 0) {
        this.destroyEntity(world, shieldEntity);
      } else {
        const render = world.getComponent<RenderComponent>(shieldEntity, "Render");
        if (render) render.hitFlashFrames = 5;
      }
    }
  }

  private destroyEntity(world: World, entity: number): void {
    world.removeEntity(entity);
  }

  private reclaimEntity(world: World, entity: number): void {
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
    if (reclaimable) {
      reclaimable.onReclaim(world, entity);
    }
    world.removeEntity(entity);
  }

  private createExplosion(world: World, x: number, y: number, color: string): void {
    for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100 + 50;
      createParticle(
        world,
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        this.particlePool
      );
    }
  }

  private checkInvadersBottom(world: World, gameState: GameStateComponent): void {
    const invaders = world.query("Invader", "Position");
    const limit = GAME_CONFIG.SCREEN_HEIGHT - 100;

    for (const invader of invaders) {
      const pos = world.getComponent<PositionComponent>(invader, "Position");
      if (pos && pos.y > limit) {
        gameState.isGameOver = true;
        break;
      }
    }
  }
}

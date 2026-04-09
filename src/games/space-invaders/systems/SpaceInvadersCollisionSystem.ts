import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity } from "../../../engine/types/EngineTypes";
import { EventBus } from "../../../engine/core/EventBus";
import {
  TransformComponent,
  HealthComponent,
  RenderComponent,
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
import { RandomService } from "../../../engine/utils/RandomService";

/**
 * System that handles all game collisions.
 */
export class SpaceInvadersCollisionSystem extends CollisionSystem {
  private particlePool: ParticlePool;

  constructor(particlePool: ParticlePool) {
    super();
    this.particlePool = particlePool;
  }

  protected onCollision(world: World, e1: Entity, e2: Entity): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    this.handleCollision(world, e1, e2, gameState);
  }

  public override update(world: World, deltaTime: number): void {
    super.update(world, deltaTime);

    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      // Special check: Invaders reaching the bottom
      this.checkInvadersBottom(world, gameState);
    }
  }

  private handleCollision(world: World, e1: Entity, e2: Entity, gameState: GameStateComponent): void {
    const invaderBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Invader");
    if (invaderBullet) {
      const { PlayerBullet: bullet, Invader: invader } = invaderBullet;
      const invaderComp = world.getComponent<InvaderComponent>(invader, "Invader");
      if (invaderComp) {
        gameState.score += invaderComp.points;
      }

      const pos = world.getComponent<TransformComponent>(invader, "Transform");
      if (pos) this.createExplosion(world, pos.x, pos.y, "#FFFFFF");

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) eventBus.emit("si:kill", { chain: 1 });

      this.destroyEntity(world, invader);
      this.destroyEntity(world, bullet);
      return;
    }

    const bulletShield = this.matchPair(world, e1, e2, "PlayerBullet", "Shield") ||
                        this.matchPair(world, e1, e2, "EnemyBullet", "Shield");
    if (bulletShield) {
      const bullet = (bulletShield as any).PlayerBullet || (bulletShield as any).EnemyBullet;
      const shield = (bulletShield as any).Shield;
      this.damageShield(world, shield);
      this.destroyEntity(world, bullet);
      return;
    }

    const enemyBulletPlayer = this.matchPair(world, e1, e2, "EnemyBullet", "Player");
    if (enemyBulletPlayer) {
      const { EnemyBullet: bullet, Player: player } = enemyBulletPlayer;
      const health = world.getComponent<HealthComponent>(player, "Health");
      if (health && health.invulnerableRemaining <= 0) {
        health.current -= 1;
        health.invulnerableRemaining = 1500;

        const render = world.getComponent<RenderComponent>(player, "Render");
        if (render) render.hitFlashFrames = 10;

        gameState.lives = health.current;
        gameState.screenShake = { intensity: 10, duration: 300 };

        if (health.current <= 0) {
          gameState.isGameOver = true;
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) eventBus.emit("game:over");
        }
      }
      this.destroyEntity(world, bullet);
      return;
    }

    const invaderPlayer = this.matchPair(world, e1, e2, "Invader", "Player");
    if (invaderPlayer) {
      gameState.isGameOver = true;
      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) eventBus.emit("game:over");
      return;
    }

    const invaderShield = this.matchPair(world, e1, e2, "Invader", "Shield");
    if (invaderShield) {
      this.destroyEntity(world, invaderShield.Shield);
      return;
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


  private createExplosion(world: World, x: number, y: number, color: string): void {
    for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
      const angle = RandomService.next() * Math.PI * 2;
      const speed = RandomService.next() * 100 + 50;
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
    const invaders = world.query("Invader", "Transform");
    const limit = GAME_CONFIG.SCREEN_HEIGHT - 100;

    for (const invader of invaders) {
      const pos = world.getComponent<TransformComponent>(invader, "Transform");
      if (pos && pos.y > limit) {
        gameState.isGameOver = true;
        const eventBus = world.getResource<EventBus>("EventBus");
        if (eventBus) eventBus.emit("game:over");
        break;
      }
    }
  }
}

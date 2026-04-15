import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import { Entity, CollisionEventsComponent } from "../../../engine/types/EngineTypes";
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
import { BossComponent } from "./BossSystem";
import { ParticlePool } from "../EntityPool";
import { createParticle } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";
import { JuiceSystem } from "../../../engine/systems/JuiceSystem";

/**
 * System that handles all game collisions by reacting to events from CollisionSystem2D.
 */
export class SpaceInvadersCollisionSystem extends System {
  constructor(private _particlePool: ParticlePool) {
    super();
  }

  public override update(world: World, _deltaTime: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    const entitiesWithEvents = world.query("CollisionEvents");
    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;
      for (const event of eventsComp.collisions) {
        this.handleCollision(world, entity, event.otherEntity, gameState);
        if (gameState.isGameOver) return;
      }
    }

    // Special check: Invaders reaching the bottom
    this.checkInvadersBottom(world, gameState);
  }

  private handleCollision(world: World, e1: Entity, e2: Entity, gameState: GameStateComponent): void {
    const bossBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Boss");
    if (bossBullet) {
      const { PlayerBullet: bullet, Boss: boss } = bossBullet;
      const bossComp = world.getComponent<BossComponent>(boss, "Boss");
      const health = world.getComponent<HealthComponent>(boss, "Health");

      if (bossComp) {
        bossComp.hp -= 1;
        gameState.score += 100;
        if (health) health.current = bossComp.hp;

        const render = world.getComponent<RenderComponent>(boss, "Render");
        if (render) render.hitFlashFrames = 5;

        const pos = world.getComponent<TransformComponent>(boss, "Transform");
        if (pos) {
          this.createExplosion(world, pos.x, pos.y, "#FF00FF");
        }
      }

      world.removeEntity(bullet);
      return;
    }

    const invaderBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Invader");
    if (invaderBullet) {
      const { PlayerBullet: bullet, Invader: invader } = invaderBullet;
      const invaderComp = world.getComponent<InvaderComponent>(invader, "Invader");

      // Lógica de Combo
      gameState.combo += 1;
      gameState.multiplier = Math.min(GAME_CONFIG.MAX_MULTIPLIER, 1 + Math.floor(gameState.combo / 5));
      gameState.comboTimerRemaining = GAME_CONFIG.COMBO_TIMEOUT;

      if (invaderComp) {
        gameState.score += invaderComp.points * gameState.multiplier;
      }

      const pos = world.getComponent<TransformComponent>(invader, "Transform");
      if (pos) {
        this.createExplosion(world, pos.x, pos.y, "#FFFFFF");

        // Popup de combo flotante
        const popup = world.createEntity();
        world.addComponent(popup, { type: "Transform", x: pos.x, y: pos.y - 20, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(popup, {
          type: "Render",
          shape: "text",
          size: 16,
          color: "#FFFF00",
          rotation: 0,
          zIndex: 100,
          data: { content: `x${gameState.multiplier}` }
        });
        world.addComponent(popup, { type: "UIText", content: `x${gameState.multiplier}` });
        world.addComponent(popup, { type: "TTL", remaining: 1000, total: 1000 });

        JuiceSystem.add(world, popup, { property: "y", target: pos.y - 60, duration: 1000, easing: "easeOut" });
        JuiceSystem.add(world, popup, { property: "opacity", target: 0, duration: 1000, easing: "easeIn" });
      }

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) eventBus.emit("si:kill", { chain: gameState.combo });

      const render = world.getComponent<RenderComponent>(invader, "Render");
      if (render) render.hitFlashFrames = 4;

      const kamiComp = world.getComponent(invader, 'Kamikaze');
      if (kamiComp) {
        gameState.kamikazesActive--;
      }

      world.removeEntity(invader);
      world.removeEntity(bullet);
      return;
    }

    const bulletShield = this.matchPair(world, e1, e2, "PlayerBullet", "Shield") ||
                        this.matchPair(world, e1, e2, "EnemyBullet", "Shield");
    if (bulletShield) {
      const bullet = (bulletShield as any).PlayerBullet || (bulletShield as any).EnemyBullet;
      const shield = (bulletShield as any).Shield;
      this.damageShield(world, shield);
      world.removeEntity(bullet);
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
      world.removeEntity(bullet);
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
      world.removeEntity(invaderShield.Shield);
      return;
    }
  }

  private damageShield(world: World, shieldEntity: number): void {
    const shield = world.getComponent<ShieldComponent>(shieldEntity, "Shield");
    if (shield) {
      shield.hp -= 1;
      if (shield.hp <= 0) {
        world.removeEntity(shieldEntity);
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
        this._particlePool
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

  private matchPair<T1 extends string, T2 extends string>(
    world: World,
    entityA: Entity,
    entityB: Entity,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }
}

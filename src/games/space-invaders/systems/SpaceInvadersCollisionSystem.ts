import { World } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { Entity, CollisionEventsComponent, TTLComponent } from "@tiny-aster/core";
import { EventBus } from "@tiny-aster/core";
import {
  TransformComponent,
  HealthComponent,
  RenderComponent,
} from "@tiny-aster/core";
import { UITextComponent } from "@tiny-aster/core";
import {
  GameStateComponent,
  InvaderComponent,
  ShieldComponent,
} from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { BossComponent } from "./BossSystem";
import { ParticlePool } from "../EntityPool";
import { createParticle } from "../EntityFactory";
import { JuiceSystem } from "@tiny-aster/core";

/**
 * System that handles all game collisions by reacting to events from CollisionSystem2D.
 */
export class SpaceInvadersCollisionSystem extends System {
  private config?: SpaceInvadersConfig;

  constructor(private _particlePool: ParticlePool) {
    super();
  }

  public override update(world: World, _deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    const entitiesWithEvents = world.query("CollisionEvents");
    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
      if (!eventsComp) continue;
      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.handleCollision(world, entity, event.otherEntity);

        // Re-check game over state after each collision
        const currentGS = world.getSingleton<GameStateComponent>("GameState");
        if (currentGS?.isGameOver) return;
      }
    }

    // Special check: Invaders reaching the bottom
    this.checkInvadersBottom(world, gameState);
  }

  private handleCollision(world: World, e1: Entity, e2: Entity): void {
    // TAREA 4: Recuperación explícita del estado del juego
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    const bossBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Boss");
    if (bossBullet) {
      const { PlayerBullet: bullet, Boss: boss } = bossBullet;
      const bossComp = world.getComponent<BossComponent>(boss, "Boss");
      const health = world.getComponent<HealthComponent>(boss, "Health");

      if (bossComp) {
        // Cálculos fuera de la mutación
        const nextHp = bossComp.hp - 1;
        const nextScore = gameState.score + 100;

        world.mutateComponent<BossComponent>(boss, "Boss", b => {
            b.hp = nextHp;
        });

        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.score = nextScore;
        });

        if (health) {
            world.mutateComponent<HealthComponent>(boss, "Health", h => {
                h.current = nextHp;
            });
        }

        world.mutateComponent<RenderComponent>(boss, "Render", r => {
            r.hitFlashFrames = 5;
        });

        const pos = world.getComponent<TransformComponent>(boss, "Transform");
        if (pos) {
          this.createExplosion(world, pos.x, pos.y, "#FF00FF");
        }
      }

      world.getCommandBuffer().removeEntity(bullet);
      return;
    }

    const invaderBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Invader");
    if (invaderBullet) {
      const { PlayerBullet: bullet, Invader: invader } = invaderBullet;
      const invaderComp = world.getComponent<InvaderComponent>(invader, "Invader");

      // Lógica de Combo - Cálculos fuera
      const nextCombo = gameState.combo + 1;
      const nextMultiplier = Math.min(this.config!.MAX_MULTIPLIER, 1 + Math.floor(nextCombo / 5));
      const nextComboTimer = this.config!.COMBO_TIMEOUT;
      let scoreGain = 0;
      if (invaderComp) {
        scoreGain = invaderComp.points * nextMultiplier;
      }
      const nextScore = gameState.score + scoreGain;

      world.mutateSingleton<GameStateComponent>("GameState", gs => {
          gs.combo = nextCombo;
          gs.multiplier = nextMultiplier;
          gs.comboTimerRemaining = nextComboTimer;
          gs.score = nextScore;
      });

      const pos = world.getComponent<TransformComponent>(invader, "Transform");
      if (pos) {
        const explosionX = pos.x;
        const explosionY = pos.y;
        const comboText = `x${nextMultiplier}`;

        this.createExplosion(world, explosionX, explosionY, "#FFFFFF");

        // Popup de combo flotante
        world.getCommandBuffer().createEntity(popup => {
            // Nota: Usamos nextMultiplier calculado fuera
            world.getCommandBuffer().addComponent(popup, { type: "Transform", x: explosionX, y: explosionY - 20, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.getCommandBuffer().addComponent(popup, {
              type: "Render",
              shape: "text",
              size: 16,
              color: "#FFFF00",
              rotation: 0,
              zIndex: 100,
              data: { content: comboText }
            } as RenderComponent);
            world.getCommandBuffer().addComponent(popup, { type: "UIText", content: comboText, wordWrap: false, maxLines: 1 } as UITextComponent);
            world.getCommandBuffer().addComponent(popup, { type: "TTL", remaining: 1000, total: 1000 } as TTLComponent);

            // Side-effects like Juice are deferred naturally or can be applied here
            JuiceSystem.add(world, popup, { property: "y", target: -40, duration: 1000, easing: "easeOut" });
            JuiceSystem.add(world, popup, { property: "opacity", target: 0, duration: 1000, easing: "easeIn" });
        });
      }

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) {
        eventBus.emitDeferred("si:kill", { chain: nextCombo });
        eventBus.emitDeferred("entity:destroyed", { entity: invader, type: "Invader" });
      }

      world.mutateComponent<RenderComponent>(invader, "Render", render => {
          render.hitFlashFrames = 4;
      });

      const hasKami = world.hasComponent(invader, 'Kamikaze');
      if (hasKami) {
        const nextKamikazes = gameState.kamikazesActive - 1;
        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.kamikazesActive = nextKamikazes;
        });
      }

      world.getCommandBuffer().removeEntity(invader);
      world.getCommandBuffer().removeEntity(bullet);
      return;
    }

    const bulletShield = this.matchPair(world, e1, e2, "PlayerBullet", "Shield") ||
                        this.matchPair(world, e1, e2, "EnemyBullet", "Shield");
    if (bulletShield) {
      const bullet = (bulletShield as Record<string, Entity>).PlayerBullet || (bulletShield as Record<string, Entity>).EnemyBullet;
      const shield = (bulletShield as Record<string, Entity>).Shield;
      this.damageShield(world, shield);
      world.getCommandBuffer().removeEntity(bullet);
      return;
    }

    const enemyBulletPlayer = this.matchPair(world, e1, e2, "EnemyBullet", "Player");
    if (enemyBulletPlayer) {
      const { EnemyBullet: bullet, Player: player } = enemyBulletPlayer;
      const health = world.getComponent<HealthComponent>(player, "Health");
      if (health && health.invulnerableRemaining <= 0) {
        // Cálculos fuera
        const nextHealth = health.current - 1;
        const isGameOver = nextHealth <= 0;

        world.mutateComponent<HealthComponent>(player, "Health", h => {
            h.current = nextHealth;
            h.invulnerableRemaining = 1500;
        });

        world.mutateComponent<RenderComponent>(player, "Render", render => {
            render.hitFlashFrames = 10;
        });

        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.lives = nextHealth;
            gs.screenShake = { intensity: 10, duration: 300 };
            if (isGameOver) {
                gs.isGameOver = true;
            }
        });
      }
      world.getCommandBuffer().removeEntity(bullet);
      return;
    }

    const invaderPlayer = this.matchPair(world, e1, e2, "Invader", "Player");
    if (invaderPlayer) {
      world.mutateSingleton<GameStateComponent>("GameState", gs => {
          gs.isGameOver = true;
      });
      return;
    }

    const invaderShield = this.matchPair(world, e1, e2, "Invader", "Shield");
    if (invaderShield) {
      world.getCommandBuffer().removeEntity(invaderShield.Shield);
      return;
    }
  }

  private damageShield(world: World, shieldEntity: number): void {
    const shield = world.getComponent<ShieldComponent>(shieldEntity, "Shield");
    if (!shield) return;

    const nextHp = shield.hp - 1;
    const expired = nextHp <= 0;

    world.mutateComponent<ShieldComponent>(shieldEntity, "Shield", s => {
      s.hp = nextHp;
    });

    if (expired) {
      world.getCommandBuffer().removeEntity(shieldEntity);
    } else {
      world.mutateComponent<RenderComponent>(shieldEntity, "Render", render => {
        render.hitFlashFrames = 5;
      });
    }
  }

  private createExplosion(world: World, x: number, y: number, color: string): void {
    // Solución: Usar el stream determinista aprobado para la fase de simulación
    const rng = world.gameplayRandom;

    for (let i = 0; i < this.config!.PARTICLE_COUNT; i++) {
      const angle = rng.next() * Math.PI * 2;
      const speed = rng.next() * 100 + 50;

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

  private checkInvadersBottom(world: World, _gameState: GameStateComponent): void {
    const invaders = world.query("Invader", "Transform");
    const limit = this.config!.SCREEN_HEIGHT - 100;

    for (const invader of invaders) {
      const pos = world.getComponent<TransformComponent>(invader, "Transform");
      if (pos && pos.y > limit) {
        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.isGameOver = true;
        });
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

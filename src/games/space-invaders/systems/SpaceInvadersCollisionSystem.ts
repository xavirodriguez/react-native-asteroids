import { World, ComponentType, Juice } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { Entity } from "@tiny-aster/core";
import { EventBus } from "@tiny-aster/core";
import { TransformComponent, HealthComponent, RenderComponent, TTLComponent } from "@tiny-aster/core";
import {
  GameStateComponent,
  InvaderComponent,
  ShieldComponent,
  BossComponent,
  UITextComponent,
  SpaceInvadersComponentRegistry,
  GAME_CONFIG
} from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { ParticlePool } from "../EntityPool";
import { createParticle } from "../EntityFactory";

/**
 * System that handles all game collisions by reacting to events from CollisionSystem2D.
 */
export class SpaceInvadersCollisionSystem extends System<SpaceInvadersComponentRegistry> {
  private config?: SpaceInvadersConfig;

  constructor(private _particlePool: ParticlePool) {
    super();
  }

  public override update(world: World<SpaceInvadersComponentRegistry>, _deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton("GameState");
    if (!gameState || gameState.isGameOver) return;

    const entitiesWithEvents = world.query("CollisionEvents");
    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent(entity, "CollisionEvents");
      if (!eventsComp) continue;
      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.handleCollision(world, entity, event.otherEntity);

        // Re-check game over state after each collision
        const currentGS = world.getSingleton("GameState");
        if (currentGS?.isGameOver) return;
      }
    }

    // Special check: Invaders reaching the bottom
    this.checkInvadersBottom(world, gameState);
  }

  private handleCollision(world: World<SpaceInvadersComponentRegistry>, e1: Entity, e2: Entity): void {
    // TAREA 4: Recuperación explícita del estado del juego
    const gameState = world.getSingleton("GameState");
    if (!gameState) return;

    const bossBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Boss");
    if (bossBullet) {
      const { PlayerBullet: bullet, Boss: boss } = bossBullet;
      const bossComp = world.getComponent(boss, "Boss");
      const health = world.getComponent(boss, "Health");

      if (bossComp) {
        // Cálculos fuera de la mutación
        const nextHp = bossComp.hp - 1;
        const nextScore = gameState.score + 100;

        world.mutateComponent(boss, "Boss", b => {
            b.hp = nextHp;
        });

        world.mutateSingleton("GameState", gs => {
            gs.score = nextScore;
        });

        if (health) {
            world.mutateComponent(boss, "Health", h => {
                h.current = nextHp;
            });
        }

        world.mutateComponent(boss, "Render", r => {
            r.hitFlashFrames = 5;
        });

        const pos = world.getComponent(boss, "Transform");
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
      const invaderComp = world.getComponent(invader, "Invader");

      // Mutate generic Combo component on the GameState entity
      const comboEntity = world.query("GameState")[0];
      let nextCombo = 0;
      let nextMultiplier = 1;

      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
          c.combo++;
          c.timerRemaining = c.timerDuration;
          c.multiplier = Math.min(this.config!.MAX_MULTIPLIER, 1 + Math.floor(c.combo / 5));
          nextCombo = c.combo;
          nextMultiplier = c.multiplier;
        });
      }

      let scoreGain = 0;
      if (invaderComp) {
        scoreGain = invaderComp.points * nextMultiplier;
      }
      const nextScore = gameState.score + scoreGain;

      world.mutateSingleton("GameState", gs => {
          gs.score = nextScore;
      });

      const pos = world.getComponent(invader, "Transform");
      if (pos) {
        const explosionX = pos.x;
        const explosionY = pos.y;
        const comboText = `x${nextMultiplier}`;

        this.createExplosion(world, explosionX, explosionY, "#FFFFFF");

        // Popup de combo flotante
        const popup = world.reserveEntityId();
        world.getCommandBuffer().createEntity(popup);
        world.getCommandBuffer().addComponent(popup, { type: "Transform", x: explosionX, y: explosionY - 20, rotation: 0, scaleX: 1, scaleY: 1, worldX: explosionX, worldY: explosionY - 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.getCommandBuffer().addComponent(popup, {
          type: "Render",
          spriteId: "text",
          color: "#FFFF00",
          visible: true,
          opacity: 1,
          order: 100,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0,
          data: { content: comboText }
        } as unknown as RenderComponent);
        world.getCommandBuffer().addComponent(popup, { type: "UIText", content: comboText, wordWrap: false, maxLines: 1 } as UITextComponent);
        world.getCommandBuffer().addComponent(popup, { type: "TTL", timeLeft: 1000, remaining: 1000 } as TTLComponent);

        // Side-effects like Juice are deferred naturally or can be applied here
        Juice.add(world, popup, { property: "y", target: -40, duration: 1000, easing: "easeOut" });
        Juice.add(world, popup, { property: "opacity", target: 0, duration: 1000, easing: "easeIn" });
      }

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) {
        eventBus.emitDeferred("si:kill", { chain: nextCombo });
        eventBus.emitDeferred("entity:destroyed", { entity: invader, type: "Invader" });
      }

      world.mutateComponent(invader, "Render", render => {
          render.hitFlashFrames = 4;
      });

      const hasKami = world.hasComponent(invader, 'Kamikaze');
      if (hasKami) {
        const nextKamikazes = gameState.kamikazesActive - 1;
        world.mutateSingleton("GameState", gs => {
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
      const health = world.getComponent(player, "Health");
      if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining <= 0) {
        // Cálculos fuera
        const nextHealth = health.current - 1;
        const isGameOver = nextHealth <= 0;

        world.mutateComponent(player, "Health", h => {
            h.current = nextHealth;
            h.invulnerableRemaining = 1500;
        });

        world.mutateComponent(player, "Render", render => {
            render.hitFlashFrames = 10;
        });

        world.mutateSingleton("GameState", gs => {
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
      world.mutateSingleton("GameState", gs => {
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

  private damageShield(world: World<SpaceInvadersComponentRegistry>, shieldEntity: number): void {
    const shield = world.getComponent(shieldEntity, "Shield");
    if (!shield) return;

    const nextHp = shield.hp - 1;
    const expired = nextHp <= 0;

    world.mutateComponent(shieldEntity, "Shield", s => {
      s.hp = nextHp;
    });

    if (expired) {
      world.getCommandBuffer().removeEntity(shieldEntity);
    } else {
      world.mutateComponent(shieldEntity, "Render", render => {
        render.hitFlashFrames = 5;
      });
    }
  }

  private createExplosion(world: World<SpaceInvadersComponentRegistry>, x: number, y: number, color: string): void {
    // Solución: Usar el stream diseñado para la reproducción determinista en la fase de simulación
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

  private checkInvadersBottom(world: World<SpaceInvadersComponentRegistry>, _gameState: GameStateComponent): void {
    const invaders = world.query("Invader", "Transform");
    const limit = GAME_CONFIG.SCREEN_HEIGHT - 100;

    for (const invader of invaders) {
      const pos = world.getComponent(invader, "Transform");
      if (pos && pos.y > limit) {
        world.mutateSingleton("GameState", gs => {
            gs.isGameOver = true;
        });
        break;
      }
    }
  }

  private matchPair<T1 extends ComponentType<SpaceInvadersComponentRegistry>, T2 extends ComponentType<SpaceInvadersComponentRegistry>>(
    world: World<SpaceInvadersComponentRegistry>,
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

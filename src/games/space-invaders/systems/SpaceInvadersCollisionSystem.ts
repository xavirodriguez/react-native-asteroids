import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import { Entity, CollisionEventsComponent, TTLComponent } from "../../../engine/types/EngineTypes";
import { EventBus } from "../../../engine/core/EventBus";
import {
  TransformComponent,
  HealthComponent,
  RenderComponent,
} from "../../../engine/types/EngineTypes";
import { UITextComponent } from "../../../engine/ui/UITypes";
import {
  GameStateComponent,
  InvaderComponent,
  ShieldComponent,
} from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { BossComponent } from "./BossSystem";
import { ParticlePool } from "../EntityPool";
import { createParticle } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";
import { JuiceSystem } from "../../../engine/systems/JuiceSystem";

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
        if (gameState.isGameOver) return;
      }
    }

    // Special check: Invaders reaching the bottom
    this.checkInvadersBottom(world, gameState);
  }

  private handleCollision(world: World, e1: Entity, e2: Entity): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    const bossBullet = this.matchPair(world, e1, e2, "PlayerBullet", "Boss");
    if (bossBullet) {
      const { PlayerBullet: bullet, Boss: boss } = bossBullet;
      const bossComp = world.getComponent<BossComponent>(boss, "Boss");
      const health = world.getComponent<HealthComponent>(boss, "Health");

      if (bossComp) {
        world.mutateComponent<BossComponent>(boss, "Boss", b => {
            b.hp -= 1;
        });

        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.score += 100;
        });

        if (health) {
            world.mutateComponent<HealthComponent>(boss, "Health", h => {
                h.current = bossComp.hp;
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

      // Lógica de Combo
      world.mutateSingleton<GameStateComponent>("GameState", gs => {
          gs.combo += 1;
          gs.multiplier = Math.min(this.config!.MAX_MULTIPLIER, 1 + Math.floor(gs.combo / 5));
          gs.comboTimerRemaining = this.config!.COMBO_TIMEOUT;
          if (invaderComp) {
            gs.score += invaderComp.points * gs.multiplier;
          }
      });

      const pos = world.getComponent<TransformComponent>(invader, "Transform");
      if (pos) {
        this.createExplosion(world, pos.x, pos.y, "#FFFFFF");

        // Popup de combo flotante
        world.getCommandBuffer().createEntity(popup => {
            world.getCommandBuffer().addComponent(popup, { type: "Transform", x: pos.x, y: pos.y - 20, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.getCommandBuffer().addComponent(popup, {
              type: "Render",
              shape: "text",
              size: 16,
              color: "#FFFF00",
              rotation: 0,
              zIndex: 100,
              data: { content: `x${gameState.multiplier}` }
            } as RenderComponent);
            world.getCommandBuffer().addComponent(popup, { type: "UIText", content: `x${gameState.multiplier}`, wordWrap: false, maxLines: 1 } as UITextComponent);
            world.getCommandBuffer().addComponent(popup, { type: "TTL", remaining: 1000, total: 1000 } as TTLComponent);

            // Side-effects like Juice are deferred naturally or can be applied here
            JuiceSystem.add(world, popup, { property: "y", target: -40, duration: 1000, easing: "easeOut" });
            JuiceSystem.add(world, popup, { property: "opacity", target: 0, duration: 1000, easing: "easeIn" });
        });
      }

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) {
        eventBus.emitDeferred("si:kill", { chain: gameState.combo });
        eventBus.emitDeferred("entity:destroyed", { entity: invader, type: "Invader" });
      }

      world.mutateComponent<RenderComponent>(invader, "Render", render => {
          render.hitFlashFrames = 4;
      });

      const hasKami = world.hasComponent(invader, 'Kamikaze');
      if (hasKami) {
        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.kamikazesActive--;
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
        world.mutateComponent<HealthComponent>(player, "Health", h => {
            h.current -= 1;
            h.invulnerableRemaining = 1500;
        });

        world.mutateComponent<RenderComponent>(player, "Render", render => {
            render.hitFlashFrames = 10;
        });

        world.mutateSingleton<GameStateComponent>("GameState", gs => {
            gs.lives = health.current;
            gs.screenShake = { intensity: 10, duration: 300 };
            if (health.current <= 0) {
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
    let expired = false;
    world.mutateComponent<ShieldComponent>(shieldEntity, "Shield", shield => {
      shield.hp -= 1;
      expired = shield.hp <= 0;
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
    const renderRandom = RandomService.getRenderRandom();
    for (let i = 0; i < this.config!.PARTICLE_COUNT; i++) {
      const angle = renderRandom.next() * Math.PI * 2;
      const speed = renderRandom.next() * 100 + 50;
      createParticle(
        world,
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        this._particlePool,
        true // deferred
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

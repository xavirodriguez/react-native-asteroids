import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import {
  type HealthComponent,
  type Entity,
  TransformComponent,
  RenderComponent,
  CollisionEventsComponent,
} from "../../../engine/types/EngineTypes";

import { createParticle } from "../EntityFactory";
import { type AsteroidComponent, type GameStateComponent } from "../types/AsteroidTypes";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { ScreenShakeComponent, HapticRequestComponent } from "../../../engine/types/EngineTypes";
import { releaseProjectile } from "../../../engine/utils/ProjectileUtils";
import { ParticlePool, BulletPool } from "../EntityPool";
import { EventBus } from "../../../engine/core/EventBus";

/**
 * Sistema responsable de reaccionar a los eventos de colisión detectados por el motor físico.
 *
 * @responsibility Resolver las consecuencias lógicas de los impactos (daño, destrucción, score).
 *
 * @remarks
 * Este sistema actúa como un despachador reactivo. En lugar de calcular colisiones,
 * lee el componente `CollisionEvents` poblado por el `CollisionSystem2D`.
 *
 * ### Flujo de Resolución:
 * 1. Identifica pares de entidades involucradas (ej. Bullet vs Asteroid).
 * 2. Aplica lógica de negocio:
 *    - **Asteroides**: Se dividen en fragmentos menores y emiten eventos de destrucción.
 *    - **Naves**: Pierden vida, activan invulnerabilidad temporal y disparan efectos de juice (shake).
 *    - **Eventos**: Notifica al `EventBus` para disparar efectos de sonido y actualizaciones de UI.
 */
export class AsteroidCollisionSystem extends System {
  private config?: AsteroidConfig;
  private splitConfig?: Record<
    AsteroidComponent["size"],
    { nextSize: "medium" | "small"; offset: number } | undefined
  >;

  constructor(private _particlePool: ParticlePool) {
    super();
  }

  /**
   * Processes collision events from the CollisionEventsComponent.
   */
  public update(world: World, _deltaTime: number): void {
    if (!this.config) {
      const config = world.getResource<AsteroidConfig>("GameConfig");

      if (!config) {
        throw new Error(
          "[AsteroidCollisionSystem] Missing GameConfig resource. " +
            "Ensure world.setResource('GameConfig', config) is called before registering or updating this system."
        );
      }

      this.config = config;
      this.splitConfig = {
        large: {
          nextSize: "medium",
          offset: this.config.ASTEROID_SPLIT_OFFSET_LARGE,
        },
        medium: {
          nextSize: "small",
          offset: this.config.ASTEROID_SPLIT_OFFSET_MEDIUM,
        },
        small: undefined,
      };
    }
    const query = world.getQuery("CollisionEvents");

    query.forEach((entity) => {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
      if (!eventsComp) return;

      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.resolveCollision(world, entity, event.otherEntity);
      }
    });
  }

  private resolveCollision(world: World, entityA: Entity, entityB: Entity): void {
    if (this.handleBulletAsteroidPair(world, entityA, entityB)) return;
    if (this.handleShipAsteroidPair(world, entityA, entityB)) return;
  }

  private handleBulletAsteroidPair(world: World, entityA: Entity, entityB: Entity): boolean {
    const match = this.matchPair(world, entityA, entityB, "Bullet", "Asteroid");

    if (match) {
      this.handleBulletAsteroidCollision(
        world,
        match.Asteroid,
        match.Bullet,
      );
      return true;
    }
    return false;
  }

  private handleShipAsteroidPair(world: World, entityA: Entity, entityB: Entity): boolean {
    const match = this.matchPair(world, entityA, entityB, "Ship", "Asteroid");

    if (match) {
      this.handleShipAsteroidCollision(world, match.Ship);
      return true;
    }
    return false;
  }

  private handleBulletAsteroidCollision(
    world: World,
    asteroid: Entity,
    bullet: Entity,
  ): void {
    if (!world.hasEntity(asteroid) || !world.hasEntity(bullet)) return;

    const position = world.getComponent<TransformComponent>(asteroid, "Transform");
    const render = world.getComponent<RenderComponent>(asteroid, "Render");

    if (position && this.config) {
      this.spawnExplosion(world, position, this.config.PARTICLE_COUNT);
    }

    if (render) {
      world.mutateComponent(asteroid, "Render", (r: RenderComponent) => {
        r.hitFlashFrames = 8;
      });
    }

    this.handleAsteroidDestructionLogic(world, asteroid, bullet);
  }

  private handleAsteroidDestructionLogic(world: World, asteroid: Entity, bullet: Entity): void {
    const commands = world.getCommandBuffer();
    const transform = world.getComponent<TransformComponent>(asteroid, "Transform");
    const asteroidComp = world.getComponent<AsteroidComponent>(asteroid, "Asteroid");
    const size = asteroidComp?.size || "small";

    const bulletComp = world.getComponent<import("../types/AsteroidTypes").BulletComponent>(bullet, "Bullet");
    const ownerId = bulletComp?.ownerId;

    let points = 0;
    world.mutateSingleton<GameStateComponent>("GameState", (gameState) => {
      gameState.lastBulletHit = true;
      points = this.config!.ASTEROID_SCORE * (gameState.comboMultiplier || 1);
      this.addScore(world, points);
    });

    if (ownerId) {
      const players = world.query("Ship");
      const ownerEntity = players.find(p => world.getComponent<import("../types/AsteroidTypes").ShipComponent>(p, "Ship")?.sessionId === ownerId);
      if (ownerEntity !== undefined) {
        world.mutateComponent<import("../types/AsteroidTypes").ShipComponent>(ownerEntity, "Ship", s => {
          s.score += points;
        });
      }
    }

    this.splitAsteroid(world, asteroid);

    const bulletPool = world.getResource<BulletPool>("BulletPool");
    if (bulletPool) {
      releaseProjectile(world, bulletPool, bullet);
    } else {
      commands.removeEntity(bullet);
    }

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size, x: transform?.x, y: transform?.y });
  }

  private spawnExplosion(world: World, position: TransformComponent, count: number): void {
    const gameplayRandom = world.gameplayRandom;
    for (let i = 0; i < count; i++) {
      createParticle({
        world,
        x: position.x,
        y: position.y,
        dx: (gameplayRandom.next() - 0.5) * 160,
        dy: (gameplayRandom.next() - 0.5) * 160,
        color: i % 2 === 0 ? "#FF8800" : "#FFDD00",
        deferred: true
      });
    }
  }

  private handleShipAsteroidCollision(world: World, shipEntity: Entity): void {
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");

    if (this.canShipTakeDamage(world, shipEntity, health)) {
      this.applyDamageToShip(world, shipEntity);
    }
  }

  private canShipTakeDamage(world: World, shipEntity: Entity, health: HealthComponent | undefined): health is HealthComponent {
    const modifiers = world.getComponent<import("../../../engine/core/CoreComponents").ModifierStackComponent>(shipEntity, "ModifierStack")?.modifiers || [];
    const hasShield = modifiers.some(m => m.type === "shield");

    return !!health && health.invulnerableRemaining <= 0 && !hasShield;
  }

  private applyDamageToShip(world: World, shipEntity: Entity): void {
    const commands = world.getCommandBuffer();
    world.mutateComponent(shipEntity, "Health", (health: HealthComponent) => {
      health.current--;
      health.invulnerableRemaining = this.config!.INVULNERABILITY_DURATION;
    });

    const ships = world.query("Ship", "Render");
    for (let i = 0; i < ships.length; i++) {
      const entity = ships[i];
      world.mutateComponent(entity, "Render", (render: RenderComponent) => {
        render.hitFlashFrames = 6;
      });
    }

    const health = world.getComponent<HealthComponent>(shipEntity, "Health")!;
    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emitDeferred("ship:hit");

    // Create an additive screen shake entity instead of modifying a singleton
    commands.createEntity((shakeEntity) => {
      commands.addComponent(shakeEntity, {
        type: "ScreenShake",
        intensity: this.config!.SHAKE_INTENSITY_IMPACT,
        duration: this.config!.SHAKE_DURATION_IMPACT,
        remaining: this.config!.SHAKE_DURATION_IMPACT,
      } as ScreenShakeComponent);

      // Add TTL to handle entity cleanup automatically
      commands.addComponent(shakeEntity, {
        type: "TTL",
        remaining: this.config!.SHAKE_DURATION_IMPACT * 16.66, // Roughly duration in ms if duration is frames
        total: this.config!.SHAKE_DURATION_IMPACT * 16.66
      } as import("../../../engine/types/EngineTypes").TTLComponent);
    });

    if (health.current <= 0) {
      commands.addComponent(shipEntity, { type: "HapticRequest", pattern: "death" } as HapticRequestComponent);
    } else {
      commands.addComponent(shipEntity, { type: "HapticRequest", pattern: "damage" } as HapticRequestComponent);
    }
  }

  private splitAsteroid(world: World, asteroidEntity: Entity): void {
    const commands = world.getCommandBuffer();
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const position = world.getComponent<TransformComponent>(asteroidEntity, "Transform");

    if (asteroid && position) {
      // 15% chance to spawn power-up when large asteroid is destroyed
      if (asteroid.size === "large" && world.gameplayRandom.chance(0.15)) {
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) {
              eventBus.emitDeferred("entity:destroyed", { entity: asteroidEntity, type: "Asteroid" });
          }
      }

      // DATA-DRIVEN SPLIT: Read splitting rules directly from components (hydrated from blueprints)
      const splitsInto = (asteroid as Record<string, unknown>).splitsInto as string[] | undefined;
      const splitCount = (asteroid as Record<string, unknown>).splitCount as number | undefined;

      if (splitsInto && splitsInto.length > 0 && splitCount !== undefined) {
        const offset = (this.splitConfig as Record<string, any>)?.[asteroid.size]?.offset || 10;

        // Momentum: Inherit parent velocity
        const parentVel = world.getComponent<VelocityComponent>(asteroidEntity, "Velocity");
        const parentDx = parentVel ? parentVel.dx : 0;
        const parentDy = parentVel ? parentVel.dy : 0;

        for (let i = 0; i < splitsInto.length; i++) {
          const childBlueprintId = splitsInto[i];
          for (let count = 0; count < splitCount; count++) {
            const randomAngle = world.gameplayRandom.next() * Math.PI * 2;
            const speed = 40 + world.gameplayRandom.next() * 20;

            const spawnX = position.x + Math.cos(randomAngle) * offset;
            const spawnY = position.y + Math.sin(randomAngle) * offset;

            commands.spawnFromBlueprint(childBlueprintId, spawnX, spawnY, {
                physics: {
                    dx: parentDx + Math.cos(randomAngle) * speed,
                    dy: parentDy + Math.sin(randomAngle) * speed
                }
            } as any);
          }
        }
      }
    }
    commands.removeEntity(asteroidEntity);
  }

  private addScore(world: World, points: number): void {
    world.mutateSingleton<GameStateComponent>("GameState", (gameState) => {
      gameState.score += points;
    });
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

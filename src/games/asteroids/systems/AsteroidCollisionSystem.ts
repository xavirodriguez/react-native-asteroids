import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import {
  type AsteroidComponent,
  type HealthComponent,
  type Entity,
  TransformComponent,
  RenderComponent,
  CollisionEventsComponent,
} from "../../../engine/types/EngineTypes";

import { createAsteroid, createParticle } from "../EntityFactory";
import { type GameStateComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { ScreenShakeComponent } from "../../../engine/types/EngineTypes";
import { hapticDamage, hapticDeath } from "../../../utils/haptics";
import { ParticlePool } from "../EntityPool";
import { RandomService } from "../../../engine/utils/RandomService";
import { EventBus } from "../../../engine/core/EventBus";

const ASTEROID_SPLIT_CONFIG: Record<
  AsteroidComponent["size"],
  { nextSize: "medium" | "small"; offset: number } | undefined
> = {
  large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
  medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
  small: undefined,
};

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
  constructor(private _particlePool: ParticlePool) {
    super();
  }

  /**
   * Processes collision events from the CollisionEventsComponent.
   */
  public update(world: World, _deltaTime: number): void {
    const entitiesWithEvents = world.query("CollisionEvents");

    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
      if (!eventsComp) continue;

      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.resolveCollision(world, entity, event.otherEntity);
      }
    }
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
    const position = world.getComponent<TransformComponent>(asteroid, "Transform");
    const render = world.getComponent<RenderComponent>(asteroid, "Render");

    if (position) {
      this.spawnExplosion(world, position, GAME_CONFIG.PARTICLE_COUNT);
    }

    if (render) {
      world.mutateComponent(asteroid, "Render", (r: RenderComponent) => {
        r.hitFlashFrames = 8;
      });
    }

    this.handleAsteroidDestructionLogic(world, asteroid, bullet);
  }

  private handleAsteroidDestructionLogic(world: World, asteroid: Entity, bullet: Entity): void {
    const transform = world.getComponent<TransformComponent>(asteroid, "Transform");
    const asteroidComp = world.getComponent<AsteroidComponent>(asteroid, "Asteroid");
    const size = asteroidComp?.size || "small";

    world.mutateSingleton<GameStateComponent>("GameState", (gameState) => {
      gameState.lastBulletHit = true;
      this.addScore(world, GAME_CONFIG.ASTEROID_SCORE * (gameState.comboMultiplier || 1));
    });

    this.splitAsteroid(world, asteroid);
    world.removeEntity(bullet);

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emit("asteroid:destroyed", { entity: asteroid, size, x: transform?.x, y: transform?.y });
  }

  private spawnExplosion(world: World, position: TransformComponent, count: number): void {
    const gameplayRandom = RandomService.getInstance("gameplay");
    for (let i = 0; i < count; i++) {
      createParticle({
        world,
        x: position.x,
        y: position.y,
        dx: (gameplayRandom.next() - 0.5) * 160,
        dy: (gameplayRandom.next() - 0.5) * 160,
        color: i % 2 === 0 ? "#FF8800" : "#FFDD00",
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
    world.mutateComponent(shipEntity, "Health", (health: HealthComponent) => {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
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
    if (eventBus) eventBus.emit("ship:hit");

    // Create an additive screen shake entity instead of modifying a singleton
    const shakeEntity = world.createEntity();
    world.addComponent(shakeEntity, {
      type: "ScreenShake",
      intensity: GAME_CONFIG.SHAKE_INTENSITY_IMPACT,
      duration: GAME_CONFIG.SHAKE_DURATION_IMPACT,
      remaining: GAME_CONFIG.SHAKE_DURATION_IMPACT,
    } as ScreenShakeComponent);

    // Add TTL to handle entity cleanup automatically
    world.addComponent(shakeEntity, {
      type: "TTL",
      remaining: GAME_CONFIG.SHAKE_DURATION_IMPACT * 16.66, // Roughly duration in ms if duration is frames
      total: GAME_CONFIG.SHAKE_DURATION_IMPACT * 16.66
    } as import("../../../engine/types/EngineTypes").TTLComponent);

    if (health.current <= 0) {
      hapticDeath();
      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) eventBus.emit("game:over");
    } else {
      hapticDamage();
    }
  }

  private splitAsteroid(world: World, asteroidEntity: Entity): void {
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const position = world.getComponent<TransformComponent>(asteroidEntity, "Transform");

    if (asteroid && position) {
      // 15% chance to spawn power-up when large asteroid is destroyed
      if (asteroid.size === "large" && RandomService.getInstance("gameplay").chance(0.15)) {
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) {
              eventBus.emit("entity:destroyed", { entity: asteroidEntity, type: "Asteroid" });
          }
      }

      this.executeSplitStrategy(world, position, asteroid.size);
    }
    world.removeEntity(asteroidEntity);
  }

  private executeSplitStrategy(
    world: World,
    position: TransformComponent,
    size: AsteroidComponent["size"],
  ): void {
    const config = ASTEROID_SPLIT_CONFIG[size];

    if (config) {
      this.spawnSplit(world, position, config.nextSize, config.offset);
    }
  }

  private spawnSplit(
    world: World,
    position: TransformComponent,
    size: "medium" | "small",
    offset: number,
  ): void {
    const a1 = createAsteroid({ world, x: position.x + offset, y: position.y + offset, size });
    const a2 = createAsteroid({ world, x: position.x - offset, y: position.y - offset, size });

    const spawns = [a1, a2];
    for (let i = 0; i < spawns.length; i++) {
      const entity = spawns[i];
      world.mutateComponent(entity, "Render", (render: RenderComponent) => {
        render.hitFlashFrames = 10;
      });
    }
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

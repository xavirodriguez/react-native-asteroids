import { World } from "../../../engine";
import { System } from "../../../engine/System";
import {
  type AsteroidComponent,
  type HealthComponent,
  type Entity,
  TransformComponent,
  RenderComponent,
  CollisionEventsComponent,
} from "../../../engine/EngineTypes";

import { createAsteroid, createParticle } from "../EntityFactory";
import { type GameStateComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { ScreenShakeComponent } from "../../../engine/EngineTypes";
import { hapticDamage, hapticDeath } from "../../../utils/haptics";
import { ParticlePool } from "../EntityPool";
import { RandomService } from "../../../engine/RandomService";
import { EventBus } from "../../../engine/EventBus";

const ASTEROID_SPLIT_CONFIG: Record<
  AsteroidComponent["size"],
  { nextSize: "medium" | "small"; offset: number } | undefined
> = {
  large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
  medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
  small: undefined,
};

/**
 * System responsible for reacting to collision events detected by CollisionSystem2D.
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
      render.hitFlashFrames = 8;
    }

    this.handleAsteroidDestructionLogic(world, asteroid, bullet);
  }

  private handleAsteroidDestructionLogic(world: World, asteroid: Entity, bullet: Entity): void {
    const asteroidComp = world.getComponent<AsteroidComponent>(asteroid, "Asteroid");
    const size = asteroidComp?.size || "small";

    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      gameState.lastBulletHit = true;
      this.addScore(world, GAME_CONFIG.ASTEROID_SCORE * (gameState.comboMultiplier || 1));
    } else {
      this.addScore(world, GAME_CONFIG.ASTEROID_SCORE);
    }

    this.splitAsteroid(world, asteroid);
    world.removeEntity(bullet);

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emit("asteroid:destroyed", { size });
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

    if (this.canShipTakeDamage(health)) {
      this.applyDamageToShip(world, health);
    }
  }

  private canShipTakeDamage(health: HealthComponent | undefined): health is HealthComponent {
    return !!health && health.invulnerableRemaining <= 0;
  }

  private applyDamageToShip(world: World, health: HealthComponent): void {
    health.current--;
    health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;

    const ships = world.query("Ship", "Render");
    for (let i = 0; i < ships.length; i++) {
      const entity = ships[i];
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render) render.hitFlashFrames = 6;
    }

    const shake = world.getSingleton<ScreenShakeComponent>("ScreenShake");
    if (shake) {
      shake.intensity = GAME_CONFIG.SHAKE_INTENSITY_IMPACT;
      shake.remaining = GAME_CONFIG.SHAKE_DURATION_IMPACT;
    }

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
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render) render.hitFlashFrames = 10;
    }
  }

  private addScore(world: World, points: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      gameState.score += points;
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

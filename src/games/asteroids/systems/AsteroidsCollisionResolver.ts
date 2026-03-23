import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { EventBus } from "../../../engine/utils/EventBus";
import { CollisionEvent } from "../../../engine/systems/CollisionSystem";
import {
  PositionComponent,
  ColliderComponent,
  AsteroidComponent,
  HealthComponent,
  Entity,
  ComponentType,
  GAME_CONFIG,
} from "../../../types/GameTypes";
import { createAsteroid, createExplosion } from "../EntityFactory";
import { getGameState } from "../GameUtils";
import { hapticDamage, hapticDeath } from "../../../utils/haptics";

const ASTEROID_SPLIT_CONFIG: Record<
  AsteroidComponent["size"],
  { nextSize: "medium" | "small"; offset: number } | undefined
> = {
  large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
  medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
  small: undefined,
};

/**
 * System that resolves collisions for the Asteroids game.
 * It listens to generic 'collision' events from the CollisionSystem.
 */
export class AsteroidsCollisionResolver extends System {
  private unsubscribe?: () => void;

  constructor(private eventBus: EventBus) {
    super();
    this.unsubscribe = this.eventBus.on<CollisionEvent>("collision", this.handleCollision);
  }

  public update(world: World, deltaTime: number): void {
    void world;
    void deltaTime;
  }

  public destroy(): void {
    if (this.unsubscribe) this.unsubscribe();
  }

  private handleCollision = (event: CollisionEvent) => {
    const { entityA, entityB, world } = event;
    const pair = { entityA, entityB };

    if (this.handleBulletAsteroidPair({ world, pair })) return;
    if (this.handleBulletUfoPair({ world, pair })) return;
    this.handleShipAsteroidPair({ world, pair });
    this.handleShipUfoPair({ world, pair });
  };

  private handleBulletAsteroidPair(context: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Bullet", type2: "Asteroid" });

    if (match) {
      this.handleBulletAsteroidCollision({
        world,
        asteroid: match.Asteroid,
        bullet: match.Bullet,
      });
      return true;
    }
    return false;
  }

  private handleShipAsteroidPair(context: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
  }): void {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Ship", type2: "Asteroid" });

    if (match) {
      this.handleShipAsteroidCollision({ world, shipEntity: match.Ship });
    }
  }

  private handleBulletUfoPair(context: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
  }): boolean {
    const { world, pair } = context
    const match = this.matchPair({ world, pair, type1: "Bullet", type2: "Ufo" })
    if (match) {
      const pos = world.getComponent<PositionComponent>(match.Ufo, "Position")
      if (pos) createExplosion(world, pos.x, pos.y, GAME_CONFIG.UFO_SIZE)
      world.removeEntity(match.Ufo)
      world.removeEntity(match.Bullet)
      this.addScore({ world, points: 50 })
      return true
    }
    return false
  }

  private handleShipUfoPair(context: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
  }): void {
    const { world, pair } = context
    const match = this.matchPair({ world, pair, type1: "Ship", type2: "Ufo" })
    if (match) {
      const health = world.getComponent<HealthComponent>(match.Ship, "Health")
      if (this.canShipTakeDamage(health)) {
        this.applyDamageToShip(world, health)
        const pos = world.getComponent<PositionComponent>(match.Ufo, "Position")
        if (pos) createExplosion(world, pos.x, pos.y, GAME_CONFIG.UFO_SIZE)
        world.removeEntity(match.Ufo)
      }
    }
  }

  private matchPair<T1 extends ComponentType, T2 extends ComponentType>(config: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
    type1: T1
    type2: T2
  }): Record<T1 | T2, Entity> | undefined {
    const { world, pair, type1, type2 } = config
    const { entityA, entityB } = pair

    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>
    }
    return undefined
  }

  private handleBulletAsteroidCollision(context: { world: World; asteroid: Entity; bullet: Entity }): void {
    const { world, asteroid, bullet } = context;
    const pos = world.getComponent<PositionComponent>(asteroid, "Position");
    const col = world.getComponent<ColliderComponent>(asteroid, "Collider");

    if (pos && col) {
      createExplosion(world, pos.x, pos.y, col.radius);
    }
    this.splitAsteroid({ world, asteroidEntity: asteroid });
    world.removeEntity(bullet);
    this.addScore({ world, points: GAME_CONFIG.ASTEROID_SCORE });
  }

  private handleShipAsteroidCollision(context: { world: World; shipEntity: Entity }): void {
    const { world, shipEntity } = context;
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

    const gameState = getGameState(world);
    gameState.screenShake = {
        intensity: GAME_CONFIG.SHAKE_INTENSITY_IMPACT,
        duration: GAME_CONFIG.SHAKE_DURATION_IMPACT,
    };

    if (health.current <= 0) {
      hapticDeath();
    } else {
      hapticDamage();
    }
  }

  private splitAsteroid(asteroidContext: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = asteroidContext;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (asteroid && pos) {
      this.executeSplitStrategy({ world, pos, size: asteroid.size });
    }
    world.removeEntity(asteroidEntity);
  }

  private executeSplitStrategy(splitParams: {
    world: World
    pos: PositionComponent
    size: AsteroidComponent["size"]
  }): void {
    const { world, pos, size } = splitParams;
    const config = ASTEROID_SPLIT_CONFIG[size];

    if (config) {
      this.spawnSplit({ world, pos, size: config.nextSize, offset: config.offset });
    }
  }

  private spawnSplit(spawnConfig: {
    world: World
    pos: PositionComponent
    size: "medium" | "small"
    offset: number
  }): void {
    const { world, pos, size, offset } = spawnConfig
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });
  }

  private addScore(scoreContext: { world: World; points: number }): void {
    const { world, points } = scoreContext;
    const gameState = getGameState(world);
    gameState.score += points;
  }
}

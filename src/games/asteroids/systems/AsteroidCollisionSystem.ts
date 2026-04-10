import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import {
  type AsteroidComponent,
  type HealthComponent,
  type Entity,
  TransformComponent,
  RenderComponent,
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
 * System responsible for detecting and resolving collisions between entities.
 */
export class AsteroidCollisionSystem extends CollisionSystem {
  constructor(private particlePool: ParticlePool) {
    super();
  }

  /**
   * Called when a collision is detected.
   */
  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    this.resolveCollision({ world, entityA, entityB });
  }

  private resolveCollision(collisionPair: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = collisionPair;

    if (this.handleBulletAsteroidPair({ world, entityA, entityB })) return;
    if (this.handleShipAsteroidPair({ world, entityA, entityB })) return;
  }

  private handleBulletAsteroidPair(context: {
    world: World;
    entityA: Entity;
    entityB: Entity;
  }): boolean {
    const { world, entityA, entityB } = context;
    const match = this.matchPair(world, entityA, entityB, "Bullet", "Asteroid");

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
    world: World;
    entityA: Entity;
    entityB: Entity;
  }): boolean {
    const { world, entityA, entityB } = context;
    const match = this.matchPair(world, entityA, entityB, "Ship", "Asteroid");

    if (match) {
      this.handleShipAsteroidCollision({ world, shipEntity: match.Ship });
      return true;
    }
    return false;
  }

  private handleBulletAsteroidCollision(context: {
    world: World;
    asteroid: Entity;
    bullet: Entity;
  }): void {
    const { world, asteroid, bullet } = context;
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
    const position = world.getComponent<TransformComponent>(asteroid, "Transform");

    if (size === "large" && position && RandomService.getInstance("gameplay").next() < 0.3) {
      this.spawnWeaponPickup(world, position.x, position.y);
    }

    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      gameState.lastBulletHit = true;
      this.addScore({ world, points: GAME_CONFIG.ASTEROID_SCORE * gameState.comboMultiplier });
    } else {
      this.addScore({ world, points: GAME_CONFIG.ASTEROID_SCORE });
    }

    this.splitAsteroid({ world, asteroidEntity: asteroid });
    this.destroyEntity(world, bullet);

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emit("asteroid:destroyed", { size });
  }

  private spawnWeaponPickup(world: World, x: number, y: number): void {
    const types: ("triple_shot" | "plasma_rail" | "seeker_missile")[] = ["triple_shot", "plasma_rail", "seeker_missile"];
    const type = types[RandomService.getInstance("gameplay").nextInt(0, types.length)];
    const colors = { triple_shot: "#FF00FF", plasma_rail: "#00FFFF", seeker_missile: "#FFFF00" };

    const pickup = world.createEntity();
    world.addComponent(pickup, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(pickup, { type: "Render", shape: "rect", size: 15, color: colors[type], rotation: 0 } as RenderComponent);
    world.addComponent(pickup, { type: "WeaponPickup", weaponType: type } as any);
    world.addComponent(pickup, { type: "Collider", radius: 12 } as any);
    world.addComponent(pickup, { type: "TTL", remaining: 8000, total: 8000 } as any);
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

    const ships = world.query("Ship", "Render");
    ships.forEach(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render) render.hitFlashFrames = 6;
    });

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

  private splitAsteroid(asteroidContext: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = asteroidContext;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const position = world.getComponent<TransformComponent>(asteroidEntity, "Transform");

    if (asteroid && position) {
      this.executeSplitStrategy({ world, position, size: asteroid.size });
    }
    this.destroyEntity(world, asteroidEntity);
  }

  private executeSplitStrategy(splitParams: {
    world: World;
    position: TransformComponent;
    size: AsteroidComponent["size"];
  }): void {
    const { world, position, size } = splitParams;
    const config = ASTEROID_SPLIT_CONFIG[size];

    if (config) {
      this.spawnSplit({ world, position, size: config.nextSize, offset: config.offset });
    }
  }

  private spawnSplit(spawnConfig: {
    world: World;
    position: TransformComponent;
    size: "medium" | "small";
    offset: number;
  }): void {
    const { world, position, size, offset } = spawnConfig;
    const a1 = createAsteroid({ world, x: position.x + offset, y: position.y + offset, size });
    const a2 = createAsteroid({ world, x: position.x - offset, y: position.y - offset, size });

    [a1, a2].forEach(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render) render.hitFlashFrames = 10;
    });
  }

  private addScore(scoreContext: { world: World; points: number }): void {
    const { world, points } = scoreContext;
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      gameState.score += points;
    }
  }

}

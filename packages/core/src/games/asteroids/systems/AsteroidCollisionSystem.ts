import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { ParticlePool } from "../EntityPool";
import { Entity } from "../../../ecs/Entity";
import { ComponentType } from "../../../ecs/Component";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { fragmentAsteroid } from "../EntityFactory";

/** @public */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  constructor(particlePool: ParticlePool) {
    super();
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      const gameState = world.getSingleton("GameState");
      if (!gameState || gameState.isGameOver) return;

      const entitiesWithEvents = world.query("CollisionEvents");
      const processedPairs = new Set<string>();

      for (const entity of entitiesWithEvents) {
          if (!world.hasEntity(entity)) continue;

          const eventsComp = world.getComponent(entity, "CollisionEvents");
          if (!eventsComp) continue;

          for (const event of eventsComp.collisions) {
              const other = event.otherEntity;

              // 1. Ensure each collision pair is processed only once
              if (entity >= other) continue;

              // 2. Double safety: validate both entities are still alive in the world
              if (!world.hasEntity(entity) || !world.hasEntity(other)) continue;

              const pairId = `${entity},${other}`;
              if (processedPairs.has(pairId)) continue;
              processedPairs.add(pairId);

              this.handleCollision(world, entity, other);

              // Re-check game over state after each collision
              const currentGS = world.getSingleton("GameState");
              if (currentGS?.isGameOver) return;
          }
      }
  }

  private handleCollision(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, e1: Entity, e2: Entity): void {
      const gameState = world.getSingleton("GameState");
      if (!gameState) return;

      const config = world.getResource<AsteroidConfig>("GameConfig") || {
          SCREEN_WIDTH: 800,
          SCREEN_HEIGHT: 600
      };

      // 1. Bullet <-> Asteroid collision
      const bulletAsteroid = this.matchPair(world, e1, e2, "Bullet", "Asteroid");
      if (bulletAsteroid) {
          const { Bullet: bullet, Asteroid: asteroid } = bulletAsteroid;
          const asteroidComp = world.getComponent(asteroid, "Asteroid")!;
          const size = asteroidComp.size;

          // Fragment the asteroid before destroying it
          fragmentAsteroid(world, asteroid);

          // Calculate score increase
          let scoreDelta = 20;
          if (size === "medium") scoreDelta = 50;
          else if (size === "small") scoreDelta = 100;

          const nextScore = gameState.score + scoreDelta;

          world.mutateSingleton("GameState", (gs) => {
              gs.score = nextScore;
          });

          // Emit deferred events
          const eventBus = world.getEventBus();
          if (eventBus) {
              eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size: size as any });
              eventBus.emitDeferred("score:changed", { newScore: nextScore, delta: scoreDelta });
          }

          // Deferred removal
          world.getCommandBuffer().removeEntity(bullet);
          world.getCommandBuffer().removeEntity(asteroid);
          return;
      }

      // 2. Ship <-> Asteroid collision
      const shipAsteroid = this.matchPair(world, e1, e2, "Ship", "Asteroid");
      if (shipAsteroid) {
          const { Ship: ship, Asteroid: asteroid } = shipAsteroid;

          // If ship is currently invulnerable, ignore lethal collision
          if (world.hasComponent(ship, "Invulnerable" as any)) {
              return;
          }

          const asteroidComp = world.getComponent(asteroid, "Asteroid")!;
          const size = asteroidComp.size;

          // Fragment the asteroid
          fragmentAsteroid(world, asteroid);

          // Emit ship destroyed event
          const eventBus = world.getEventBus();
          if (eventBus) {
              eventBus.emitDeferred("ship:destroyed", { entity: ship });
              eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size: size as any });
          }

          let livesRemaining = 3;
          world.mutateSingleton("GameState", (gs) => {
              gs.lives--;
              livesRemaining = gs.lives;
              if (gs.lives <= 0) {
                  gs.isGameOver = true;
              }
          });

          if (livesRemaining > 0) {
              // Respawn ship at screen center, reset its velocity, and add Invulnerable component
              const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || {
                  width: config.SCREEN_WIDTH ?? 800,
                  height: config.SCREEN_HEIGHT ?? 600
              };

              world.mutateComponent(ship, "Transform", (t) => {
                  t.x = screen.width / 2;
                  t.y = screen.height / 2;
              });

              world.mutateComponent(ship, "Velocity", (v) => {
                  v.vx = 0;
                  v.vy = 0;
              });

              world.getCommandBuffer().addComponent(ship, {
                  type: "Invulnerable",
                  remaining: 3.0 // 3 seconds
              } as any);
          } else {
              // Game Over
              if (eventBus) {
                  eventBus.emitDeferred("game:over", { score: gameState.score, level: gameState.level });
              }
              world.getCommandBuffer().removeEntity(ship);
          }

          // Deferred removal of the asteroid
          world.getCommandBuffer().removeEntity(asteroid);
          return;
      }
  }

  private matchPair<
      T1 extends keyof AsteroidsComponentRegistry,
      T2 extends keyof AsteroidsComponentRegistry
  >(
      world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
      entityA: Entity,
      entityB: Entity,
      type1: T1,
      type2: T2
  ): Record<T1 | T2, Entity> | undefined {
      if (world.hasComponent(entityA, type1 as any) && world.hasComponent(entityB, type2 as any)) {
          return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
      }
      if (world.hasComponent(entityB, type1 as any) && world.hasComponent(entityA, type2 as any)) {
          return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
      }
      return undefined;
  }

  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}

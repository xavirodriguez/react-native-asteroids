import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { Entity } from "../../../ecs/Entity";
import { ComponentType } from "../../../ecs/Component";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { fragmentAsteroid } from "../EntityFactory";

/**
 * System to resolve collision logic for Asteroids.
 * Handles Bullet-Asteroid and Ship-Asteroid collisions using a double-safety approach:
 * A) Unique pair processing (entityA < entityB)
 * B) Verification that entities still exist before processing.
 * Utilizes the world CommandBuffer for deferred mutations and EventBus for deferred events.
 * @public
 */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  constructor() {
    super();
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, _deltaTime: number): void {
    // Paso 4: Double-security collision resolution system
    const entities = world.query("CollisionEvents");
    const destroyedEntities = new Set<number>();

    // 1. Iterate over collision pairs
    for (const entityA of entities) {
      const colComp = world.getComponent(entityA, "CollisionEvents");
      if (!colComp) {
        continue;
      }

      for (const collision of colComp.collisions) {
        const entityB = collision.otherEntity;

        // Doble Seguridad A: Procesa cada par solo una vez verificando if (entityA < entityB)
        if (!(entityA < entityB)) {
          continue;
        }

        // Doble Seguridad B: Antes de procesar la colisión, verifica que las entidades sigan existiendo
        const hasEntity = (entity: number): boolean => {
          if (typeof (world as unknown as { hasEntity?: (entity: number) => boolean }).hasEntity === "function") {
            return (world as unknown as { hasEntity: (entity: number) => boolean }).hasEntity(entity);
          }
          return world.hasComponent(entity, "Transform");
        };

        if (!hasEntity(entityA) || !hasEntity(entityB)) {
          continue;
        }

        // Ensure we don't process if either entity was already destroyed in this system update
        if (destroyedEntities.has(entityA) || destroyedEntities.has(entityB)) {
          continue;
        }

        const isBulletA = world.hasComponent(entityA, "Bullet");
        const isBulletB = world.hasComponent(entityB, "Bullet");
        const isAsteroidA = world.hasComponent(entityA, "Asteroid");
        const isAsteroidB = world.hasComponent(entityB, "Asteroid");
        const isShipA = world.hasComponent(entityA, "Ship");
        const isShipB = world.hasComponent(entityB, "Ship");

        // Case 1: Bullet-Asteroid
        if ((isBulletA && isAsteroidB) || (isBulletB && isAsteroidA)) {
            const bullet   = isBulletA ? entityA : entityB;
            const asteroid = isBulletA ? entityB : entityA;

            if (destroyedEntities.has(bullet) || destroyedEntities.has(asteroid)) continue;

            const asteroidComp = world.getComponent(asteroid, "Asteroid");
            const size = (asteroidComp?.size || "large") as "large" | "medium" | "small";

            let points = 20;
            if (size === "medium") points = 50;
            else if (size === "small") points = 100;

            let newScore = points;
            world.mutateSingleton("GameState", (state) => {
                state.score += points;
                newScore = state.score;
            });

            // ✅ PASO 1: Leer componentes y fragmentar ANTES de encolar la destrucción.
            // fragmentAsteroid lee Transform y Velocity del asteroide padre síncronamente.
            // createAsteroid internamente usa CommandBuffer si world.isUpdating === true,
            // por lo que los hijos se crean de forma diferida y segura.
            fragmentAsteroid(world, asteroid);

            // ✅ PASO 2: Encolar destrucción DESPUÉS de haber leído los datos del padre.
            world.getCommandBuffer().removeEntity(bullet);
            world.getCommandBuffer().removeEntity(asteroid);
            destroyedEntities.add(bullet);
            destroyedEntities.add(asteroid);

            const eventBus = world.getEventBus();
            if (eventBus) {
                eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size });
                eventBus.emitDeferred("score:changed", { newScore, delta: points });
            }

            continue;
        }

        // Case 2: Ship-Asteroid
        if ((isShipA && isAsteroidB) || (isShipB && isAsteroidA)) {
          const ship = isShipA ? entityA : entityB;
          const asteroid = isShipA ? entityB : entityA;

          if (destroyedEntities.has(ship) || destroyedEntities.has(asteroid)) {
            continue;
          }

          // Ignore collision if ship is invulnerable
          if (world.hasComponent(ship, "Invulnerable" as any)) {
            continue;
          }

          let lives = 0;
          // Decrement lives in game state
          world.mutateSingleton("GameState", (state) => {
            state.lives = Math.max(0, state.lives - 1);
            lives = state.lives;
            if (state.lives <= 0) {
              state.isGameOver = true;
            }
          });

          if (lives > 0) {
            // Respawn ship at center with invulnerability
            const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
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
              remaining: 3.0
            } as any);
          } else {
            // Modificaciones Diferidas: TODA eliminación debe hacerse con world.getCommandBuffer().removeEntity(entity)
            world.getCommandBuffer().removeEntity(ship);
            destroyedEntities.add(ship);
          }

          // Eventos Diferidos: Todo evento debe emitirse con eventBus.emitDeferred()
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("ship:destroyed", { entity: ship });
          }
        }
      }
    }
  }
  public onRegister(_world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}

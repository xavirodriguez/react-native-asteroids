import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { ParticlePool } from "../EntityPool";

/** @public */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  constructor(_particlePool: ParticlePool) {
    super();
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, _deltaTime: number): void {
    const entities = world.query("CollisionEvents");
    const destroyedEntities = new Set<number>();

    for (const entityA of entities) {
      const colComp = world.getComponent(entityA, "CollisionEvents");
      if (!colComp) continue;

      for (const collision of colComp.collisions) {
        const entityB = collision.otherEntity;

        // Doble Seguridad A: Procesa cada par solo una vez verificando if (entityA < entityB)
        if (!(entityA < entityB)) continue;

        // Doble Seguridad B: Antes de procesar la colisión, verifica que las entidades sigan existiendo
        const hasEntity = (entity: number): boolean => {
          if (typeof (world as unknown as { hasEntity?: (entity: number) => boolean }).hasEntity === "function") {
            return (world as unknown as { hasEntity: (entity: number) => boolean }).hasEntity(entity);
          }
          return world.hasComponent(entity, "Transform");
        };

        if (!hasEntity(entityA) || !hasEntity(entityB)) continue;

        // Ensure we don't process if either entity was already destroyed in this system update
        if (destroyedEntities.has(entityA) || destroyedEntities.has(entityB)) continue;

        const isBulletA = world.hasComponent(entityA, "Bullet");
        const isBulletB = world.hasComponent(entityB, "Bullet");
        const isAsteroidA = world.hasComponent(entityA, "Asteroid");
        const isAsteroidB = world.hasComponent(entityB, "Asteroid");
        const isShipA = world.hasComponent(entityA, "Ship");
        const isShipB = world.hasComponent(entityB, "Ship");

        // Case 1: Bullet-Asteroid
        if ((isBulletA && isAsteroidB) || (isBulletB && isAsteroidA)) {
          const bullet = isBulletA ? entityA : entityB;
          const asteroid = isBulletA ? entityB : entityA;

          // Double check neither bullet nor asteroid is already processed/destroyed
          if (destroyedEntities.has(bullet) || destroyedEntities.has(asteroid)) continue;

          // Process asteroid score before destroying
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

          // Modificaciones Diferidas: TODA eliminación debe hacerse con world.getCommandBuffer().removeEntity(entity)
          world.getCommandBuffer().removeEntity(bullet);
          world.getCommandBuffer().removeEntity(asteroid);
          destroyedEntities.add(bullet);
          destroyedEntities.add(asteroid);

          // Eventos Diferidos: Todo evento debe emitirse con eventBus.emitDeferred()
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size });
            eventBus.emitDeferred("score:changed", { newScore, delta: points });
          }

          // Si una bala colisiona con un asteroide, asegúrate de procesar la destrucción y continuar al siguiente par,
          // para evitar que una misma bala procese colisiones múltiples y crashee el motor en el mismo tick.
          continue;
        }

        // Case 2: Ship-Asteroid
        if ((isShipA && isAsteroidB) || (isShipB && isAsteroidA)) {
          const ship = isShipA ? entityA : entityB;
          const asteroid = isShipA ? entityB : entityA;

          if (destroyedEntities.has(ship) || destroyedEntities.has(asteroid)) continue;

          // Decrement lives in game state
          world.mutateSingleton("GameState", (state) => {
            state.lives = Math.max(0, state.lives - 1);
            if (state.lives <= 0) {
              state.isGameOver = true;
            }
          });

          // Modificaciones Diferidas: TODA eliminación debe hacerse con world.getCommandBuffer().removeEntity(entity)
          world.getCommandBuffer().removeEntity(ship);
          destroyedEntities.add(ship);

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

import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { ParticlePool } from "../EntityPool";
import { createAsteroid } from "../EntityFactory";

/** @public */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private particlePool: ParticlePool;

  constructor(particlePool: ParticlePool) {
    super();
    this.particlePool = particlePool;
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
    const collisionEntities = world.query("CollisionEvents");

    for (const entity of collisionEntities) {
      const events = world.getComponent(entity, "CollisionEvents");
      if (!events || !events.collisions) continue;

      for (const collision of events.collisions) {
        const other = collision.otherEntity;

        // 1. Filter pairs (entityA < entityB) to avoid duplicate processing in the same frame
        if (entity >= other) continue;

        // 2. Validate existence in the world prior to processing
        if (!world.hasEntity(entity) || !world.hasEntity(other)) continue;

        const isAsteroid = (e: number) => world.hasEntity(e) && world.getComponent(e, "Asteroid") !== undefined;
        const isBullet = (e: number) => world.hasEntity(e) && world.getComponent(e, "Bullet") !== undefined;
        const isShip = (e: number) => world.hasEntity(e) && world.getComponent(e, "Ship") !== undefined;

        // --- Bullet and Asteroid Collision ---
        if ((isBullet(entity) && isAsteroid(other)) || (isAsteroid(entity) && isBullet(other))) {
          const bullet = isBullet(entity) ? entity : other;
          const asteroid = isBullet(entity) ? other : entity;

          const bulletComp = world.getComponent(bullet, "Bullet");
          const astComp = world.getComponent(asteroid, "Asteroid");

          if (!bulletComp || !astComp) continue;

          // Destroy both entities using deferred commands
          world.getCommandBuffer().removeEntity(bullet);
          world.getCommandBuffer().removeEntity(asteroid);

          const size = astComp.size;

          // Emit deferred gameplay event for asteroid destroyed
          world.getEventBus().emitDeferred("asteroid:destroyed", { entity: asteroid, size } as any);

          // Spawn fragmentations (1 Large -> 2 Medium -> 2 Small)
          if (size === "large" || size === "medium") {
            const nextSize = size === "large" ? "medium" : "small";
            const transform = world.getComponent(asteroid, "Transform");
            const velocity = world.getComponent(asteroid, "Velocity");

            if (transform) {
              const tx = transform.x;
              const ty = transform.y;

              // Compute orthogonal/splitting velocities deterministically
              const baseAngle = world.gameplayRandom.next() * Math.PI * 2;
              const speed = 100; // split separation speed

              const vx1 = Math.cos(baseAngle) * speed + (velocity?.vx ?? 0) * 0.3;
              const vy1 = Math.sin(baseAngle) * speed + (velocity?.vy ?? 0) * 0.3;

              const vx2 = -Math.cos(baseAngle) * speed + (velocity?.vx ?? 0) * 0.3;
              const vy2 = -Math.sin(baseAngle) * speed + (velocity?.vy ?? 0) * 0.3;

              const child1 = createAsteroid({ world, x: tx, y: ty, size: nextSize });
              world.mutateComponent(child1, "Velocity", (v) => {
                v.vx = vx1;
                v.vy = vy1;
              });

              const child2 = createAsteroid({ world, x: tx, y: ty, size: nextSize });
              world.mutateComponent(child2, "Velocity", (v) => {
                v.vx = vx2;
                v.vy = vy2;
              });
            }
          }

          // Update Score in GameState
          world.mutateSingleton("GameState", (gs) => {
            let points = 20;
            if (size === "large") points = 20;
            else if (size === "medium") points = 50;
            else if (size === "small") points = 100;

            gs.score += points;
            world.getEventBus().emitDeferred("score:changed", { newScore: gs.score, delta: points } as any);
          });
        }

        // --- Ship and Asteroid Collision ---
        if ((isShip(entity) && isAsteroid(other)) || (isAsteroid(entity) && isShip(other))) {
          const ship = isShip(entity) ? entity : other;
          const asteroid = isShip(entity) ? other : entity;

          // Check for invulnerability
          const isInvuln = world.getComponent(ship, "Invulnerable" as any) !== undefined;
          if (isInvuln) {
            // Ignore lethal collisions during temporal invulnerability
            continue;
          }

          // Destroy ship using deferred commands
          world.getCommandBuffer().removeEntity(ship);
          world.getCommandBuffer().removeEntity(asteroid);

          // Emit deferred gameplay event for ship destroyed
          world.getEventBus().emitDeferred("ship:destroyed", { entity: ship } as any);
        }
      }
    }
  }

  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}

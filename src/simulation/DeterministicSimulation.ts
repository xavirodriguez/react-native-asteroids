import { World } from "../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent, HealthComponent, ColliderComponent, TTLComponent } from "../engine/types/EngineTypes";
import { PhysicsUtils } from "../engine/utils/PhysicsUtils";
import { ShipPhysics } from "../games/asteroids/utils/ShipPhysics";
import { GAME_CONFIG, type AsteroidComponent } from "../games/asteroids/types/AsteroidTypes";
import { createAsteroid, createBullet, createParticle } from "../games/asteroids/EntityFactory";
import { RandomService } from "../engine/utils/RandomService";
import { EventBus } from "../engine/core/EventBus";
import { ScreenShakeComponent } from "../engine/types/EngineTypes";

export type SimulationContext = {
    isResimulating: boolean;
};

const ASTEROID_SPLIT_CONFIG: Record<
  string,
  { nextSize: "medium" | "small"; offset: number } | undefined
> = {
  large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
  medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
  small: undefined,
};

export class DeterministicSimulation {
    public static update(world: World, deltaTime: number, ctx: SimulationContext) {
        const dtSeconds = deltaTime / 1000;

        // 1. Process Inputs & Ship Physics
        this.updateShips(world, deltaTime, dtSeconds, ctx);

        // 2. Integration & Boundary Wrapping
        this.integrateMovement(world, dtSeconds);

        // 3. TTL (Time To Live)
        this.updateTTL(world, deltaTime);

        // 4. Collision Detection & Resolution
        this.updateCollisions(world, ctx);

        // 5. Spawn Logic (UFO, Asteroid Waves)
        this.updateSpawning(world, ctx);
    }

    private static updateShips(world: World, deltaTime: number, dtSeconds: number, _ctx: SimulationContext) {
        const ships = world.query("Ship", "Transform", "Velocity", "Render");
        ships.forEach(entity => {
            const pos = world.getComponent<TransformComponent>(entity, "Transform");
            const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
            const render = world.getComponent<RenderComponent>(entity, "Render");
            const input = world.getComponent<any>(entity, "Input");

            if (pos && vel && render && input) {
                const intent = {
                    rotateLeft: input.rotateLeft,
                    rotateRight: input.rotateRight,
                    thrust: input.thrust
                };

                ShipPhysics.applyRotation(render, intent, dtSeconds);
                ShipPhysics.applyThrust(world, pos, vel, render, intent, dtSeconds);
                ShipPhysics.applyFriction(vel, deltaTime);

                // Shooting logic
                if (input.shoot) {
                    if (input.shootCooldownRemaining <= 0) {
                        createBullet({ world, x: pos.x, y: pos.y, angle: render.rotation });
                        input.shootCooldownRemaining = GAME_CONFIG.BULLET_COOLDOWN;
                    }
                }
                if (input.shootCooldownRemaining > 0) {
                    input.shootCooldownRemaining -= deltaTime;
                }
            }
        });
    }

    private static integrateMovement(world: World, dtSeconds: number) {
        const moveables = world.query("Transform", "Velocity");
        moveables.forEach(entity => {
            const pos = world.getComponent<TransformComponent>(entity, "Transform");
            const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
            if (pos && vel) {
                PhysicsUtils.integrateMovement(pos, vel, dtSeconds);

                const boundary = world.getComponent<any>(entity, "Boundary");
                if (boundary) {
                    PhysicsUtils.wrapBoundary(pos, boundary.width, boundary.height);
                } else {
                     PhysicsUtils.wrapBoundary(pos, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
                }
            }
        });
    }

    private static updateTTL(world: World, deltaTime: number) {
        const ttls = world.query("TTL");
        ttls.forEach(entity => {
            const ttl = world.getComponent<TTLComponent>(entity, "TTL");
            if (ttl) {
                ttl.remaining -= deltaTime;
                if (ttl.remaining <= 0) {
                    world.removeEntity(entity);
                }
            }
        });
    }

    private static updateCollisions(world: World, ctx: SimulationContext) {
        const bullets = world.query("Bullet", "Transform", "Collider");
        const asteroids = world.query("Asteroid", "Transform", "Collider");
        const ships = world.query("Ship", "Transform", "Collider", "Health");

        // Bullet vs Asteroid
        bullets.forEach(bullet => {
            const bPos = world.getComponent<TransformComponent>(bullet, "Transform")!;
            const bCol = world.getComponent<ColliderComponent>(bullet, "Collider")!;

            asteroids.forEach(asteroid => {
                if (!world.hasComponent(asteroid, "Asteroid")) return; // Might have been destroyed in this loop
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
                const aCol = world.getComponent<ColliderComponent>(asteroid, "Collider")!;

                const dx = bPos.x - aPos.x;
                const dy = bPos.y - aPos.y;
                const distSq = dx * dx + dy * dy;
                const minDist = bCol.radius + aCol.radius;

                if (distSq < minDist * minDist) {
                    this.handleBulletAsteroidCollision(world, bullet, asteroid, ctx);
                }
            });
        });

        // Ship vs Asteroid
        ships.forEach(ship => {
            const sPos = world.getComponent<TransformComponent>(ship, "Transform")!;
            const sCol = world.getComponent<ColliderComponent>(ship, "Collider")!;
            const sHealth = world.getComponent<HealthComponent>(ship, "Health")!;

            if (sHealth.invulnerableRemaining > 0) {
                sHealth.invulnerableRemaining -= deltaTime;
                return;
            }

            asteroids.forEach(asteroid => {
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
                const aCol = world.getComponent<ColliderComponent>(asteroid, "Collider")!;

                const dx = sPos.x - aPos.x;
                const dy = sPos.y - aPos.y;
                const distSq = dx * dx + dy * dy;
                const minDist = sCol.radius + aCol.radius;

                if (distSq < minDist * minDist) {
                    this.handleShipAsteroidCollision(world, ship, asteroid, ctx);
                }
            });
        });
    }

    private static handleBulletAsteroidCollision(world: World, bullet: Entity, asteroid: Entity, ctx: SimulationContext) {
        const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
        const asteroidComp = world.getComponent<AsteroidComponent>(asteroid, "Asteroid")!;
        const size = asteroidComp.size;

        if (!ctx.isResimulating) {
            this.spawnExplosion(world, aPos);
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) eventBus.emit("asteroid:destroyed", { size });
        }

        this.splitAsteroid(world, asteroid);
        world.removeEntity(bullet);

        const gameState = world.getSingleton<any>("GameState");
        if (gameState) {
            gameState.score += GAME_CONFIG.ASTEROID_SCORE;
        }
    }

    private static handleShipAsteroidCollision(world: World, ship: Entity, _asteroid: Entity, ctx: SimulationContext) {
        const health = world.getComponent<HealthComponent>(ship, "Health")!;
        health.current--;
        health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;

        if (!ctx.isResimulating) {
             const shake = world.getSingleton<ScreenShakeComponent>("ScreenShake");
             if (shake) {
                 shake.intensity = GAME_CONFIG.SHAKE_INTENSITY_IMPACT;
                 shake.remaining = GAME_CONFIG.SHAKE_DURATION_IMPACT;
             }
             // Haptics/Audio would go here
        }

        if (health.current <= 0) {
             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emit("game:over");
        }
    }

    private static splitAsteroid(world: World, asteroidEntity: Entity) {
        const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid")!;
        const position = world.getComponent<TransformComponent>(asteroidEntity, "Transform")!;
        const config = ASTEROID_SPLIT_CONFIG[asteroid.size];

        if (config) {
            createAsteroid({ world, x: position.x + config.offset, y: position.y + config.offset, size: config.nextSize });
            createAsteroid({ world, x: position.x - config.offset, y: position.y - config.offset, size: config.nextSize });
        }
        world.removeEntity(asteroidEntity);
    }

    private static spawnExplosion(world: World, position: TransformComponent) {
        const gameplayRandom = RandomService.getInstance("gameplay");
        for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
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

    private static updateSpawning(world: World, _ctx: SimulationContext) {
        const asteroids = world.query("Asteroid");
        if (asteroids.length === 0) {
            // Spawn next wave
            const gameplayRandom = RandomService.getInstance("gameplay");
            for (let i = 0; i < 6; i++) {
                createAsteroid({
                    world,
                    x: gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_WIDTH),
                    y: gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_HEIGHT),
                    size: "large"
                });
            }
        }
    }
}

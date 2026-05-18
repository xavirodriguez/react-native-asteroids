/**
 * Core simulation orchestrator for the Asteroids game logic.
 */

import { World } from "../engine/core/World";
import { Entity, TransformComponent, VelocityComponent, RenderComponent, HealthComponent, Collider2DComponent, TTLComponent, BoundaryComponent } from "../engine/types/EngineTypes";
import { PhysicsUtils } from "../engine/physics/utils/PhysicsUtils";
import { ShipPhysics } from "../games/asteroids/utils/ShipPhysics";
import { GAME_CONFIG, type AsteroidComponent, type GameStateComponent, type UfoComponent, type InputComponent } from "../games/asteroids/types/AsteroidTypes";
import { createAsteroid, createParticle, createUfo } from "../games/asteroids/EntityFactory";
import { RandomService } from "../engine/utils/RandomService";
import { EventBus } from "../engine/core/EventBus";
import { ScreenShakeComponent } from "../engine/types/EngineTypes";

/**
 * Context provided to simulation steps to handle specific execution modes.
 */
export type SimulationContext = {
    /**
     * If true, the simulation is running a rollback reconciliation.
     * Side effects like spawning particles or emitting events should be suppressed.
     */
    isResimulating: boolean;
    /**
     * If true, the simulation is running in a server/headless environment.
     * Platform-specific side effects (haptics) should be bypassed.
     */
    isHeadless?: boolean;
};

/**
 * Configuration mapping for asteroid fragmentation.
 */
const ASTEROID_SPLIT_CONFIG: Record<
  string,
  { nextSize: "medium" | "small"; offset: number } | undefined
> = {
  large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
  medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
  small: undefined,
};

/**
 * Core simulation orchestrator designed for perfect reproducibility (Determinism).
 *
 * @deprecated Use headless ECS mode via `new AsteroidsGame({ headless: true })` instead.
 * This class is maintained for legacy compatibility during migration.
 *
 * @remarks
 * **HARDENING RULES**:
 * 1. **No direct mutations**: Always use `world.mutateComponent`.
 * 2. **No structural changes**: All entity/component creation or removal must use `WorldCommandBuffer`.
 * 3. **No synchronous side-effects**: Always use `eventBus.emitDeferred` for gameplay events.
 * 4. **Deterministic Randomness**: Use the world-provided PRNG streams (via resources if available).
 */
export class DeterministicSimulation {
    /**
     * Entry point for an individual simulation tick.
     */
    public static update(world: World, deltaTime: number, ctx: SimulationContext, config: typeof GAME_CONFIG = GAME_CONFIG) {
        this.internalUpdate(world, deltaTime, ctx, config);
    }

    /**
     * Internal sequence of simulation phases.
     */
    private static internalUpdate(world: World, deltaTime: number, ctx: SimulationContext, config: typeof GAME_CONFIG) {
        const dtSeconds = deltaTime / 1000;

        // 0. Server tick synchronization.
        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
            if (gs.serverTick === undefined) gs.serverTick = 0;
            gs.serverTick++;
        });

        // 1. Process Inputs and Ship Physics.
        this.updateShips(world, deltaTime, ctx, config);

        // 2. Movement Integration.
        this.integrateMovement(world, dtSeconds, config);

        // 3. TTL (Time To Live).
        this.updateTTL(world, deltaTime);

        // 4. Collision Detection and Resolution.
        this.updateCollisions(world, ctx, deltaTime, config);

        // 5. UFO behavior logic.
        this.updateUfos(world, dtSeconds, config);

        // 6. Spawning Logic.
        this.updateSpawning(world, ctx, config);
    }

    private static updateUfos(world: World, dtSeconds: number, config: typeof GAME_CONFIG) {
        const ufos = world.query("Ufo", "Transform", "Velocity");
        ufos.forEach((entity) => {
          const ufo = world.getComponent<UfoComponent>(entity, "Ufo");

          if (ufo) {
            world.mutateComponent(entity, "Ufo", (u: UfoComponent) => {
                u.time += dtSeconds;
            });

            world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
                t.y = ufo.baseY + Math.sin(ufo.time * GAME_CONFIG.UFO_OSCILLATION_FREQUENCY) * GAME_CONFIG.UFO_OSCILLATION_AMPLITUDE;
            });

            // UFOs that go off-screen horizontally are removed
            const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
            if (pos.x < -50 || pos.x > config.SCREEN_WIDTH + 50) {
              world.getCommandBuffer().removeEntity(entity);
            }
          }
        });
    }

    private static updateShips(world: World, deltaTime: number, ctx: SimulationContext, config: typeof GAME_CONFIG) {
        const ships = world.query("Ship", "Transform", "Velocity", "Render", "Input");
        ships.forEach(entity => {
            const pos = world.getComponent<TransformComponent>(entity, "Transform");
            const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
            const render = world.getComponent<RenderComponent>(entity, "Render");
            const input = world.getComponent<InputComponent>(entity, "Input");

            if (pos && vel && render && input) {
                // ShipPhysics must use world.mutateComponent internally for any state change
                ShipPhysics.simulateShipTick(
                    world,
                    entity,
                    pos,
                    vel,
                    render,
                    input,
                    deltaTime,
                    ctx,
                    config
                );
            }
        });
    }

    private static integrateMovement(world: World, dtSeconds: number, config: typeof GAME_CONFIG) {
        const moveables = world.query("Transform", "Velocity");
        moveables.forEach(entity => {
            if (world.hasComponent(entity, "ManualMovement")) return;

            const pos = world.getComponent<TransformComponent>(entity, "Transform");
            const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
            if (pos && vel) {
                world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
                    PhysicsUtils.integrateMovement(t, vel, dtSeconds);

                    const boundary = world.getComponent<BoundaryComponent>(entity, "Boundary");
                    if (boundary) {
                        PhysicsUtils.wrapBoundary(t, boundary.width, boundary.height);
                    } else {
                         PhysicsUtils.wrapBoundary(t, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
                    }
                });
            }
        });
    }

    private static updateTTL(world: World, deltaTime: number) {
        const ttls = world.query("TTL");
        ttls.forEach(entity => {
            let expired = false;
            world.mutateComponent<TTLComponent>(entity, "TTL", (t) => {
                t.remaining -= deltaTime;
                expired = t.remaining <= 0;
            });
            if (expired) {
                world.getCommandBuffer().removeEntity(entity);
            }
        });
    }

    private static updateCollisions(world: World, ctx: SimulationContext, deltaTime: number, config: typeof GAME_CONFIG) {
        const ships = world.query("Ship", "Health");
        ships.forEach(ship => {
            world.mutateComponent(ship, "Health", (h: HealthComponent) => {
                if (h.invulnerableRemaining > 0) {
                    h.invulnerableRemaining -= deltaTime;
                    if (h.invulnerableRemaining < 0) h.invulnerableRemaining = 0;
                }
            });
        });

        const bullets = world.query("Bullet", "Transform", "Collider2D");
        const asteroids = world.query("Asteroid", "Transform", "Collider2D");

        // Spatial partitioning optimization
        const spatialGrid = world.getResource<import("../engine/physics/utils/SpatialGrid").SpatialGrid>("SpatialGrid");
        if (spatialGrid) {
            spatialGrid.clear();
            asteroids.forEach(asteroid => {
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
                const aCol = world.getComponent<Collider2DComponent>(asteroid, "Collider2D")!;
                const aRadius = aCol.shape.type === "circle" ? aCol.shape.radius : 0;
                spatialGrid.insert(asteroid, {
                    minX: aPos.x - aRadius,
                    maxX: aPos.x + aRadius,
                    minY: aPos.y - aRadius,
                    maxY: aPos.y + aRadius
                });
            });
        }

        bullets.forEach(bullet => {
            const bPos = world.getComponent<TransformComponent>(bullet, "Transform");
            const bCol = world.getComponent<Collider2DComponent>(bullet, "Collider2D");
            if (!bPos || !bCol) return;

            const bRadius = bCol.shape.type === "circle" ? bCol.shape.radius : 0;

            asteroids.forEach(asteroid => {
                if (!world.hasComponent(asteroid, "Asteroid")) return;
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform");
                const aCol = world.getComponent<Collider2DComponent>(asteroid, "Collider2D");
                if (!aPos || !aCol) return;

                const aRadius = aCol.shape.type === "circle" ? aCol.shape.radius : 0;

                const dx = bPos.x - aPos.x;
                const dy = bPos.y - aPos.y;
                const distSq = dx * dx + dy * dy;
                const minDist = bRadius + aRadius;

                if (distSq < minDist * minDist) {
                    this.handleBulletAsteroidCollision(world, bullet, asteroid, ctx, config);
                }
            });
        });

        ships.forEach(ship => {
            const sPos = world.getComponent<TransformComponent>(ship, "Transform");
            const sCol = world.getComponent<Collider2DComponent>(ship, "Collider2D");
            const sHealth = world.getComponent<HealthComponent>(ship, "Health");
            if (!sPos || !sCol || !sHealth || sHealth.invulnerableRemaining > 0) return;

            const sRadius = sCol.shape.type === "circle" ? sCol.shape.radius : 0;

            asteroids.forEach(asteroid => {
                if (!world.hasComponent(asteroid, "Asteroid")) return;
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform");
                const aCol = world.getComponent<Collider2DComponent>(asteroid, "Collider2D");
                if (!aPos || !aCol) return;

                const aRadius = aCol.shape.type === "circle" ? aCol.shape.radius : 0;

                const dx = sPos.x - aPos.x;
                const dy = sPos.y - aPos.y;
                const distSq = dx * dx + dy * dy;
                const minDist = sRadius + aRadius;

                if (distSq < minDist * minDist) {
                    this.handleShipAsteroidCollision(world, ship, asteroid, ctx, config);
                }
            });
        });
    }

    private static handleBulletAsteroidCollision(world: World, bullet: Entity, asteroid: Entity, ctx: SimulationContext, config: typeof GAME_CONFIG) {
        const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
        const asteroidComp = world.getComponent<AsteroidComponent>(asteroid, "Asteroid")!;
        const size = asteroidComp.size;

        if (!ctx.isResimulating) {
            this.spawnExplosion(world, aPos, config);
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) eventBus.emitDeferred("asteroid:destroyed", { size });
        }

        this.splitAsteroid(world, asteroid);
        world.getCommandBuffer().removeEntity(bullet);

        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
            gs.score += config.ASTEROID_SCORE;
        });
    }

    private static handleShipAsteroidCollision(world: World, ship: Entity, _asteroid: Entity, ctx: SimulationContext, config: typeof GAME_CONFIG) {
        let isDead = false;
        world.mutateComponent(ship, "Health", (h: HealthComponent) => {
            h.current--;
            h.invulnerableRemaining = config.INVULNERABILITY_DURATION;
            if (h.current <= 0) isDead = true;
        });

        if (!ctx.isResimulating) {
             const sPos = world.getComponent<TransformComponent>(ship, "Transform")!;
             this.spawnExplosion(world, sPos, config);
             world.mutateSingleton<ScreenShakeComponent>("ScreenShake", (shake) => {
                 shake.intensity = config.SHAKE_INTENSITY_IMPACT;
                 shake.remaining = config.SHAKE_DURATION_IMPACT;
             });
             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emitDeferred("ship:hit");
        }

        if (isDead) {
             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emitDeferred("game:over");
        }
    }

    private static splitAsteroid(world: World, asteroidEntity: Entity) {
        const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
        const position = world.getComponent<TransformComponent>(asteroidEntity, "Transform");

        if (asteroid && position) {
          const config = ASTEROID_SPLIT_CONFIG[asteroid.size];

          if (config) {
              createAsteroid({ world, x: position.x + config.offset, y: position.y + config.offset, size: config.nextSize, deferred: true });
              createAsteroid({ world, x: position.x - config.offset, y: position.y - config.offset, size: config.nextSize, deferred: true });
          }
        }
        world.getCommandBuffer().removeEntity(asteroidEntity);
    }

    private static spawnExplosion(world: World, position: TransformComponent, config: typeof GAME_CONFIG) {
        const renderRandom = RandomService.getRenderRandom();
        const EXPLOSION_VELOCITY_SCALE = 160;

        for (let i = 0; i < config.PARTICLE_COUNT; i++) {
          createParticle({
            world,
            x: position.x,
            y: position.y,
            dx: (renderRandom.next() - 0.5) * EXPLOSION_VELOCITY_SCALE,
            dy: (renderRandom.next() - 0.5) * EXPLOSION_VELOCITY_SCALE,
            color: i % 2 === 0 ? "#FF8800" : "#FFDD00",
            deferred: true
          });
        }
    }

    private static updateSpawning(world: World, ctx: SimulationContext, config: typeof GAME_CONFIG) {
        const asteroids = world.query("Asteroid");
        const gameplayRandom = RandomService.getInstance("gameplay");

        if (asteroids.length === 0) {
            if (!ctx.isResimulating) {
                const eventBus = world.getResource<EventBus>("EventBus");
                if (eventBus) eventBus.emitDeferred("wave:complete");
            }

            for (let i = 0; i < GAME_CONFIG.ASTEROIDS_PER_WAVE; i++) {
                createAsteroid({
                    world,
                    x: gameplayRandom.nextRange(0, config.SCREEN_WIDTH),
                    y: gameplayRandom.nextRange(0, config.SCREEN_HEIGHT),
                    size: "large",
                    deferred: true
                });
            }
        }

        // Random UFO spawn
        if (world.query("Ufo").length === 0 && gameplayRandom.chance(config.UFO_SPAWN_CHANCE)) {
          createUfo({ world, deferred: true });
        }
    }
}

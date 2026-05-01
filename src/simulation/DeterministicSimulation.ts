/**
 * Core simulation orchestrator for the Asteroids game logic.
 *
 * This module centralizes all state-altering logic in a way that is reproducible across
 * different platforms and network clients. It strictly follows a fixed-step update
 * pattern and relies on deterministic services.
 *
 * @remarks
 * To maintain determinism:
 * - Only use `RandomService.getInstance("gameplay")` for logic that affects game state.
 * - Avoid using `Date.now()` or `Math.random()` directly inside simulation methods.
 * - Ensure system update order is consistent.
 *
 * @packageDocumentation
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
};

/**
 * Configuration mapping for asteroid fragmentation.
 * Defines the next size and position offset when an asteroid is destroyed.
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
 * Game simulation orchestrator designed for reproducibility.
 *
 * @remarks
 * Consolidates the fixed-step update loop for the Asteroids game domain.
 * It coordinates movement, collisions, spawning, and life-cycle management.
 */
export class DeterministicSimulation {
    /**
     * Entry point for a single simulation tick.
     *
     * @param world - The ECS world to update.
     * @param deltaTime - Fixed time step in milliseconds (expected to be 16.66ms).
     * @param ctx - Execution context (Forward vs Resimulation).
     */
    public static update(world: World, deltaTime: number, ctx: SimulationContext) {
        // Only lock gameplay context during resimulation.
        // Forward simulation may legitimately trigger visual effects that use the render RNG.
        if (ctx.isResimulating) {
            RandomService.lockGameplayContext = true;
        }
        try {
            this.internalUpdate(world, deltaTime, ctx);
        } finally {
            RandomService.lockGameplayContext = false;
        }
    }

    /**
     * Internal sequence of simulation phases.
     * The order of these calls is critical for deterministic behavior.
     */
    private static internalUpdate(world: World, deltaTime: number, ctx: SimulationContext) {
        const dtSeconds = deltaTime / 1000;

        // 0. Update server tick in GameState
        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
            gs.serverTick++;
        });

        // 1. Process Inputs & Ship Physics (Includes Integration & Boundary for Ships)
        this.updateShips(world, deltaTime, ctx);

        // 2. Integration & Boundary Wrapping (For Non-Ship entities)
        this.integrateMovement(world, dtSeconds);

        // 3. TTL (Time To Live)
        this.updateTTL(world, deltaTime);

        // 4. Collision Detection & Resolution
        this.updateCollisions(world, ctx, deltaTime);

        // 5. UFO logic
        this.updateUfos(world, dtSeconds);

        // 6. Spawn Logic (UFO, Asteroid Waves)
        this.updateSpawning(world, ctx);
    }

    private static updateUfos(world: World, dtSeconds: number) {
        const ufos = world.query("Ufo", "Transform", "Velocity");
        ufos.forEach((entity) => {
          const pos = world.getComponent<TransformComponent>(entity, "Transform");
          const ufo = world.getComponent<UfoComponent>(entity, "Ufo");

          if (pos && ufo) {
            world.mutateComponent(entity, "Ufo", (u: UfoComponent) => {
                u.time += dtSeconds;
            });

            // Update vertical position with sine wave oscillation
            // Amplitude: 30 pixels, Frequency: 2 rad/s
            // These values are currently hardcoded heuristics for UFO flight patterns.
            const UFO_OSCILLATION_AMPLITUDE = 30;
            const UFO_OSCILLATION_FREQUENCY = 2;

            world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
                t.y = ufo.baseY + Math.sin(ufo.time * UFO_OSCILLATION_FREQUENCY) * UFO_OSCILLATION_AMPLITUDE;
            });

            // UFOs that go off-screen horizontally are removed
            if (pos.x < -50 || pos.x > GAME_CONFIG.SCREEN_WIDTH + 50) {
              world.removeEntity(entity);
            }
          }
        });
    }

    private static updateShips(world: World, deltaTime: number, ctx: SimulationContext) {
        const ships = world.query("Ship", "Transform", "Velocity", "Render", "Input");
        ships.forEach(entity => {
            const pos = world.getComponent<TransformComponent>(entity, "Transform");
            const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
            const render = world.getComponent<RenderComponent>(entity, "Render");
            const input = world.getComponent<InputComponent>(entity, "Input");

            if (pos && vel && render && input) {
                ShipPhysics.simulateShipTick(
                    world,
                    entity,
                    pos,
                    vel,
                    render,
                    input,
                    deltaTime,
                    ctx,
                    GAME_CONFIG
                );
            }
        });
    }

    private static integrateMovement(world: World, dtSeconds: number) {
        // We exclude entities with "ManualMovement" as they are processed elsewhere (e.g. ships)
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
                         PhysicsUtils.wrapBoundary(t, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
                    }
                });
            }
        });
    }

    private static updateTTL(world: World, deltaTime: number) {
        const ttls = world.query("TTL");
        ttls.forEach(entity => {
            const ttl = world.getComponent<TTLComponent>(entity, "TTL");
            if (ttl) {
                world.mutateComponent(entity, "TTL", (t: TTLComponent) => {
                    t.remaining -= deltaTime;
                });
                if (ttl.remaining <= 0) {
                    world.removeEntity(entity);
                }
            }
        });
    }

    private static updateCollisions(world: World, ctx: SimulationContext, deltaTime: number) {
        // Handle invulnerability cooldown for ships
        const ships = world.query("Ship", "Health");
        ships.forEach(ship => {
            const sHealth = world.getComponent<HealthComponent>(ship, "Health")!;
            if (sHealth.invulnerableRemaining > 0) {
                world.mutateComponent(ship, "Health", (h: HealthComponent) => {
                    h.invulnerableRemaining -= deltaTime;
                    if (h.invulnerableRemaining < 0) h.invulnerableRemaining = 0;
                });
            }
        });

        const bullets = world.query("Bullet", "Transform", "Collider2D");
        const asteroids = world.query("Asteroid", "Transform", "Collider2D");

        // Bullet vs Asteroid
        bullets.forEach(bullet => {
            const bPos = world.getComponent<TransformComponent>(bullet, "Transform")!;
            const bCol = world.getComponent<Collider2DComponent>(bullet, "Collider2D")!;
            const bRadius = bCol.shape.type === "circle" ? bCol.shape.radius : 0;

            asteroids.forEach(asteroid => {
                if (!world.hasComponent(asteroid, "Asteroid")) return;
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
                const aCol = world.getComponent<Collider2DComponent>(asteroid, "Collider2D")!;
                const aRadius = aCol.shape.type === "circle" ? aCol.shape.radius : 0;

                const dx = bPos.x - aPos.x;
                const dy = bPos.y - aPos.y;
                const distSq = dx * dx + dy * dy;
                const minDist = bRadius + aRadius;

                if (distSq < minDist * minDist) {
                    this.handleBulletAsteroidCollision(world, bullet, asteroid, ctx);
                }
            });
        });

        // Ship vs Asteroid
        ships.forEach(ship => {
            const sPos = world.getComponent<TransformComponent>(ship, "Transform")!;
            const sCol = world.getComponent<Collider2DComponent>(ship, "Collider2D");
            const sHealth = world.getComponent<HealthComponent>(ship, "Health")!;
            if (!sCol || sHealth.invulnerableRemaining > 0) return;

            const sRadius = sCol.shape.type === "circle" ? sCol.shape.radius : 0;

            asteroids.forEach(asteroid => {
                if (!world.hasComponent(asteroid, "Asteroid")) return;
                const aPos = world.getComponent<TransformComponent>(asteroid, "Transform")!;
                const aCol = world.getComponent<Collider2DComponent>(asteroid, "Collider2D")!;
                const aRadius = aCol.shape.type === "circle" ? aCol.shape.radius : 0;

                const dx = sPos.x - aPos.x;
                const dy = sPos.y - aPos.y;
                const distSq = dx * dx + dy * dy;
                const minDist = sRadius + aRadius;

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

        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
            gs.score += GAME_CONFIG.ASTEROID_SCORE;
        });
    }

    private static handleShipAsteroidCollision(world: World, ship: Entity, _asteroid: Entity, ctx: SimulationContext) {
        let isDead = false;
        world.mutateComponent(ship, "Health", (h: HealthComponent) => {
            h.current--;
            h.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
            if (h.current <= 0) isDead = true;
        });

        if (!ctx.isResimulating) {
             world.mutateSingleton<ScreenShakeComponent>("ScreenShake", (shake) => {
                 shake.intensity = GAME_CONFIG.SHAKE_INTENSITY_IMPACT;
                 shake.remaining = GAME_CONFIG.SHAKE_DURATION_IMPACT;
             });
             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emit("ship:hit");
        }

        if (isDead) {
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

    /**
     * Spawns cosmetic particles at the given position.
     * Uses `renderRandom` to ensure particle patterns don't affect gameplay determinism.
     */
    private static spawnExplosion(world: World, position: TransformComponent) {
        const renderRandom = RandomService.getRenderRandom();
        // Base velocity multiplier for explosion spread
        const EXPLOSION_VELOCITY_SCALE = 160;

        for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
          createParticle({
            world,
            x: position.x,
            y: position.y,
            dx: (renderRandom.next() - 0.5) * EXPLOSION_VELOCITY_SCALE,
            dy: (renderRandom.next() - 0.5) * EXPLOSION_VELOCITY_SCALE,
            color: i % 2 === 0 ? "#FF8800" : "#FFDD00", // Standard orange/yellow fire colors
          });
        }
    }

    private static updateSpawning(world: World, ctx: SimulationContext) {
        const asteroids = world.query("Asteroid");
        const gameplayRandom = RandomService.getInstance("gameplay");

        if (asteroids.length === 0) {
            // Spawn next wave
            if (!ctx.isResimulating) {
                const eventBus = world.getResource<EventBus>("EventBus");
                if (eventBus) eventBus.emit("wave:complete");
            }

            // Spawn 6 large asteroids at random positions to start a new wave.
            const ASTEROIDS_PER_WAVE = 6;
            for (let i = 0; i < ASTEROIDS_PER_WAVE; i++) {
                createAsteroid({
                    world,
                    x: gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_WIDTH),
                    y: gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_HEIGHT),
                    size: "large"
                });
            }
        }

        // Random UFO spawn
        if (world.query("Ufo").length === 0 && gameplayRandom.chance(GAME_CONFIG.UFO_SPAWN_CHANCE)) {
          createUfo({ world });
        }
    }
}

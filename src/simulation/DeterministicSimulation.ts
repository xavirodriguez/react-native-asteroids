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
 */
export class DeterministicSimulation {
    /**
     * Punto de entrada para un tick de simulación individual.
     */
    public static update(world: World, deltaTime: number, ctx: SimulationContext) {
        // Only lock gameplay context during resimulation.
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
     * Secuencia interna de fases de simulación.
     */
    private static internalUpdate(world: World, deltaTime: number, ctx: SimulationContext) {
        const dtSeconds = deltaTime / 1000;

        // 0. Sincronización del tick del servidor.
        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
            if (gs.serverTick === undefined) gs.serverTick = 0;
            gs.serverTick++;
        });

        // 1. Procesar Inputs y Física de Naves.
        this.updateShips(world, deltaTime, ctx);

        // 2. Integración de Movimiento.
        this.integrateMovement(world, dtSeconds);

        // 3. TTL (Time To Live).
        this.updateTTL(world, deltaTime);

        // 4. Detección y Resolución de Colisiones.
        this.updateCollisions(world, ctx, deltaTime);

        // 5. Lógica de comportamiento de UFOs.
        this.updateUfos(world, dtSeconds);

        // 6. Lógica de Spawning.
        this.updateSpawning(world, ctx);
    }

    private static updateUfos(world: World, dtSeconds: number) {
        const ufos = world.query("Ufo", "Transform", "Velocity");
        ufos.forEach((entity) => {
          const ufo = world.getComponent<UfoComponent>(entity, "Ufo");

          if (ufo) {
            world.mutateComponent(entity, "Ufo", (u: UfoComponent) => {
                u.time += dtSeconds;
            });

            const UFO_OSCILLATION_AMPLITUDE = 30;
            const UFO_OSCILLATION_FREQUENCY = 2;

            world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
                t.y = ufo.baseY + Math.sin(ufo.time * UFO_OSCILLATION_FREQUENCY) * UFO_OSCILLATION_AMPLITUDE;
            });

            // UFOs that go off-screen horizontally are removed
            const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
            if (pos.x < -50 || pos.x > GAME_CONFIG.SCREEN_WIDTH + 50) {
              world.getCommandBuffer().removeEntity(entity);
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

    private static updateCollisions(world: World, ctx: SimulationContext, deltaTime: number) {
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
            if (eventBus) eventBus.emitDeferred("asteroid:destroyed", { size });
        }

        this.splitAsteroid(world, asteroid);
        world.getCommandBuffer().removeEntity(bullet);

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
             if (eventBus) eventBus.emitDeferred("ship:hit");
        }

        if (isDead) {
             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emitDeferred("game:over");
        }
    }

    private static splitAsteroid(world: World, asteroidEntity: Entity) {
        const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid")!;
        const position = world.getComponent<TransformComponent>(asteroidEntity, "Transform")!;
        const config = ASTEROID_SPLIT_CONFIG[asteroid.size];

        if (config) {
            createAsteroid({ world, x: position.x + config.offset, y: position.y + config.offset, size: config.nextSize, deferred: true });
            createAsteroid({ world, x: position.x - config.offset, y: position.y - config.offset, size: config.nextSize, deferred: true });
        }
        world.getCommandBuffer().removeEntity(asteroidEntity);
    }

    private static spawnExplosion(world: World, position: TransformComponent) {
        const renderRandom = RandomService.getRenderRandom();
        const EXPLOSION_VELOCITY_SCALE = 160;

        for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
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

    private static updateSpawning(world: World, ctx: SimulationContext) {
        const asteroids = world.query("Asteroid");
        const gameplayRandom = RandomService.getInstance("gameplay");

        if (asteroids.length === 0) {
            if (!ctx.isResimulating) {
                const eventBus = world.getResource<EventBus>("EventBus");
                if (eventBus) eventBus.emitDeferred("wave:complete");
            }

            const ASTEROIDS_PER_WAVE = 6;
            for (let i = 0; i < ASTEROIDS_PER_WAVE; i++) {
                createAsteroid({
                    world,
                    x: gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_WIDTH),
                    y: gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_HEIGHT),
                    size: "large",
                    deferred: true
                });
            }
        }

        // Random UFO spawn
        if (world.query("Ufo").length === 0 && gameplayRandom.chance(GAME_CONFIG.UFO_SPAWN_CHANCE)) {
          createUfo({ world, deferred: true });
        }
    }
}

/**
 * Core simulation orchestrator for the Asteroids game logic.
 *
 * This module centralizes all state-altering logic in a way that is reproducible across
 * different platforms and network clients. It strictly follows a fixed-step update
 * pattern and relies on deterministic services.
 *
 * @remarks
 * To maintain determinism, developers MUST follow these rules:
 * 1. **Pure State Logic**: Only use `RandomService.getInstance("gameplay")` for state-altering logic.
 * 2. **No External Clocks**: Avoid using `Date.now()`, `performance.now()`, or `Math.random()`.
 * 3. **Fixed Execution Order**: Ensure systems are updated in a consistent sequence across all clients.
 * 4. **Side Effect Suppression**: Use `ctx.isResimulating` to disable non-deterministic side effects
 *    like SFX or visual particles during rollbacks.
 * 5. **Floating Point Care**: Be aware that JS floating point math can vary slightly across architectures;
 *    important values should ideally be quantized.
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
 * Orquestador de la simulación del juego diseñado para la reproducibilidad (Determinismo).
 *
 * @remarks
 * Este módulo centraliza el bucle de actualización de paso fijo (Fixed Step) para Asteroids.
 * Coordina el movimiento, colisiones, spawning y gestión del ciclo de vida de forma que,
 * dada una misma semilla y una secuencia de inputs, el estado final sea idéntico en
 * cualquier cliente o servidor.
 *
 * ### Reglas de Oro del Determinismo:
 * 1. **Orden Fijo**: Los sistemas deben ejecutarse siempre en la misma secuencia (`internalUpdate`).
 * 2. **RNG Protegido**: Usar exclusivamente `RandomService.getInstance("gameplay")`.
 * 3. **Cero Relojes Externos**: Prohibido usar `Date.now()`, `performance.now()` o `Math.random()`.
 * 4. **Aislamiento de Side-Effects**: Usar `ctx.isResimulating` para desactivar sonidos o partículas visuales durante rollbacks.
 * 5. **Paso de Tiempo Fijo**: `deltaTime` debe ser constante (16.66ms) independientemente del framerate de renderizado.
 *
 * @conceptualRisk [PRECISION_DRIFT][MEDIUM] El uso de acumulaciones de punto flotante en
 * sesiones extremadamente largas puede derivar en desincronización entre arquitecturas (JS IEEE 754).
 */
export class DeterministicSimulation {
    /**
     * Punto de entrada para un tick de simulación individual.
     *
     * @remarks
     * Manages the PRNG context locking. During resimulation (rollback), the gameplay
     * context is locked to ensure that the RNG stream remains perfectly aligned
     * with the tick count, preventing visual-only effects from consuming gameplay entropy.
     *
     * @param world - The ECS world to update.
     * @param deltaTime - Fixed time step in milliseconds (expected to be 16.66ms).
     * @param ctx - Execution context (Forward vs Resimulation).
     * @param world - El mundo ECS a actualizar.
     * @param deltaTime - Paso de tiempo fijo en milisegundos (16.66ms @ 60fps).
     * @param ctx - Contexto de ejecución (Forward vs Resimulation/Rollback).
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
     * Secuencia interna de fases de simulación.
     *
     * @remarks
     * EL ORDEN ES CRÍTICO. Cambiar el orden de estas fases romperá la compatibilidad
     * con replays anteriores y causará desincronización inmediata en multijugador.
     *
     * Pipeline:
     * 1. Sincronización de Tick (Autoridad temporal).
     * 2. Intención del Jugador (Física de Naves).
     * 3. Cinemática (Integración de movimiento).
     * 4. Ciclo de Vida (TTL).
     * 5. Resolución de Conflictos (Colisiones).
     * 6. Lógica de Nivel (UFO/Waves).
     */
    private static internalUpdate(world: World, deltaTime: number, ctx: SimulationContext) {
        const dtSeconds = deltaTime / 1000;

        // 0. Sincronización del tick del servidor en el singleton GameState.
        // Actúa como la referencia temporal absoluta para el netcode.
        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
            gs.serverTick++;
        });

        // 1. Procesar Inputs y Física de Naves (Incluye Integración y Límites para naves).
        // Se ejecuta primero para permitir la predicción inmediata en el cliente.
        this.updateShips(world, deltaTime, ctx);

        // 2. Integración de Movimiento y Envoltura de Límites (Para entidades que no son naves).
        this.integrateMovement(world, dtSeconds);

        // 3. TTL (Time To Live) - Eliminación de proyectiles y partículas expiradas.
        this.updateTTL(world, deltaTime);

        // 4. Detección y Resolución de Colisiones.
        // Debe ocurrir después del movimiento para resolver el estado final del tick.
        this.updateCollisions(world, ctx, deltaTime);

        // 5. Lógica de comportamiento de UFOs (IA simple).
        this.updateUfos(world, dtSeconds);

        // 6. Lógica de Spawning (Oleadas de asteroides y UFOs aleatorios).
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

            // Actualizar posición vertical con oscilación sinusoidal
            // Amplitud: 30 píxeles, Frecuencia: 2 rad/s
            // Estos valores son heurísticas de diseño para el patrón de vuelo del UFO.
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

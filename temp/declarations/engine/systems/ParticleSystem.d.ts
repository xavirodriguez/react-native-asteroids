import { System } from "../core/System";
import { World } from "../core/World";
import { ParticleEmitterConfig, Entity } from "../types/EngineTypes";
import { PrefabPool } from "../utils/PrefabPool";
/**
 * Sistema encargado de gestionar emisores de partículas declarativos.
 * Utiliza un {@link PrefabPool} para instanciar partículas de forma eficiente,
 * minimizando la fragmentación de memoria y la presión sobre el GC.
 *
 * @responsibility Orquestar la emisión continua y por ráfagas (burst) según la configuración.
 * @responsibility Delegar la creación física de entidades de partícula al pool.
 * @queries ParticleEmitter
 * @mutates ParticleEmitter.elapsed, ParticleEmitter.active
 * @executionOrder Fase: Simulation.
 *
 * @remarks
 * El sistema opera en segundos para la tasa de emisión (rate) y ráfagas.
 * Las partículas individuales suelen ser gestionadas posteriormente por {@link TTLSystem} y {@link MovementSystem}.
 *
 * @conceptualRisk [PERFORMANCE][HIGH] Un número excesivo de emisores activos o una tasa (rate)
 * muy alta puede saturar el {@link World} con entidades de corta duración, degradando el rendimiento
 * de todas las queries del motor.
 * @conceptualRisk [DETERMINISM][MEDIUM] Utiliza `RandomService.nextRange` (global) para las propiedades
 * de la partícula. Se debe asegurar que el servicio esté correctamente inicializado para replays.
 */
export declare class ParticleSystem extends System {
    private particlePool;
    constructor(particlePool: PrefabPool<any, any>);
    update(world: World, deltaTime: number): void;
    /**
     * Static helper to emit a burst manually.
     */
    emit(world: World, config: ParticleEmitterConfig): Entity;
    private spawnParticle;
}
/**
 * Convenience method to create a ParticleEmitter entity.
 */
export declare function createEmitter(world: World, config: ParticleEmitterConfig): Entity;

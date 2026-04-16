import { System } from "../core/System";
import { World } from "../core/World";
import { ParticleEmitterComponent, ParticleEmitterConfig, Entity } from "../types/EngineTypes";
import { PrefabPool } from "../utils/PrefabPool";
import { RandomService } from "../utils/RandomService";

/**
 * Configuration parameters for spawning a single particle.
 */
export interface ParticleParams {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  ttl: number;
}

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
export class ParticleSystem extends System {
  private particlePool: PrefabPool<Record<string, Component>, ParticleParams>;

  constructor(particlePool: PrefabPool<Record<string, Component>, ParticleParams>) {
    super();
    this.particlePool = particlePool;
  }

  public update(world: World, deltaTime: number): void {
    const dtSeconds = deltaTime / 1000;
    const emitters = world.query("ParticleEmitter");

    emitters.forEach((entity) => {
      const emitter = world.getComponent<ParticleEmitterComponent>(entity, "ParticleEmitter")!;
      if (!emitter.active) return;

      const config = emitter.config;

      // Handle burst emission
      if (emitter.elapsed === 0 && config.burst && config.burst > 0) {
        for (let i = 0; i < config.burst; i++) {
          this.spawnParticle(world, config);
        }
        if (!config.loop && config.rate === 0) {
            emitter.active = false;
        }
      }

      // Handle continuous emission
      if (config.rate > 0) {
          emitter.elapsed += dtSeconds;
          const particlesToSpawn = Math.floor(emitter.elapsed * config.rate);
          for (let i = 0; i < particlesToSpawn; i++) {
            this.spawnParticle(world, config);
          }
          emitter.elapsed %= (1 / config.rate);
      } else {
          emitter.elapsed += dtSeconds; // Still advance elapsed for non-rate emitters
      }
    });
  }

  /**
   * Static helper to emit a burst manually.
   */
  public emit(world: World, config: ParticleEmitterConfig): Entity {
    return createEmitter(world, config);
  }

  private spawnParticle(world: World, config: ParticleEmitterConfig): void {
    const angle = RandomService.nextRange(config.angle.min, config.angle.max) * (Math.PI / 180);
    const speed = RandomService.nextRange(config.speed.min, config.speed.max);
    const lifetime = RandomService.nextRange(config.lifetime.min, config.lifetime.max) * 1000;
    const size = RandomService.nextRange(config.size.min, config.size.max);
    const color = config.color[RandomService.nextInt(0, config.color.length)];

    const pos = config.position || { x: 0, y: 0 };

    this.particlePool.acquire(world, {
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      ttl: lifetime,
    });
  }
}

/**
 * Convenience method to create a ParticleEmitter entity.
 */
export function createEmitter(world: World, config: ParticleEmitterConfig): Entity {
  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "ParticleEmitter",
    config,
    active: true,
    elapsed: 0,
  } as ParticleEmitterComponent);
  return entity;
}

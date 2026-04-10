import { System } from "../core/System";
import { World } from "../core/World";
import { ParticleEmitterComponent, ParticleEmitterConfig, Entity } from "../types/EngineTypes";
import { PrefabPool } from "../utils/PrefabPool";
import { RandomService } from "../utils/RandomService";

/**
 * Sistema que gestiona emisores de partículas declarativos.
 * Utiliza un `PrefabPool` para la adquisición y reciclaje eficiente de partículas.
 *
 * @responsibility Procesar emisores de partículas y spawnear nuevas entidades según la tasa de emisión.
 * @responsibility Gestionar ráfagas iniciales (burst) y ciclos de vida de emisores.
 * @queries ParticleEmitter
 * @mutates ParticleEmitter, World (Entity creation via PrefabPool)
 * @executionOrder Fase: Presentation.
 *
 * @conceptualRisk [POOL_EXHAUSTION][MEDIUM] Si el pool de partículas es pequeño y la tasa
 * de emisión es alta, las partículas dejarán de aparecer sin aviso (silently fail).
 */
export class ParticleSystem extends System {
  private particlePool: PrefabPool<any, any>;

  constructor(particlePool: PrefabPool<any, any>) {
    super();
    this.particlePool = particlePool;
  }

  /**
   * Actualiza todos los emisores de partículas activos en el mundo.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @invariant Los emisores con `rate: 0` solo emiten ráfagas iniciales (si están configuradas).
   */
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
   * Helper estático para emitir una ráfaga de partículas manualmente mediante una entidad emisor.
   */
  public emit(world: World, config: ParticleEmitterConfig): Entity {
    return createEmitter(world, config);
  }

  /**
   * Spawnea una partícula individual aplicando aleatoriedad determinista a sus propiedades.
   *
   * @conceptualRisk [DETERMINISM][LOW] Las partículas visuales deben usar `RandomService.getInstance("render")`
   * para evitar desincronizar la simulación de juego en multiplayer. Actualmente usa la instancia global implícita.
   */
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
 * Método de conveniencia para crear una entidad emisora de partículas.
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

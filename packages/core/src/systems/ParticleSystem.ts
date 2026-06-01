import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ParticleEmitterComponent, ParticleEmitterConfig, Entity, SpatialNodeComponent } from "../ecs/CoreComponents";
import { PrefabPool } from "../utils/PrefabPool";

/**
 * Configuration parameters for spawning a single particle.
 *
 * @public
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
 * System responsible for managing declarative particle emitters.
 */
export class ParticleSystem extends System {
  private particlePool: PrefabPool<Record<string, import("../ecs/Component").Component>, ParticleParams>;

  constructor(particlePool: PrefabPool<Record<string, import("../ecs/Component").Component>, ParticleParams>) {
    super();
    this.particlePool = particlePool;
  }

  public update(world: World, deltaTime: number): void {
    if (world.isReSimulating) return;

    const dtSeconds = deltaTime / 1000;
    const emitters = world.query("ParticleEmitter");

    for (let i = 0; i < emitters.length; i++) {
      const entity = emitters[i];

      const node = world.getComponent<SpatialNodeComponent>(entity, "SpatialNode");
      if (node && !node.active) continue;

      const emitter = world.getComponent<ParticleEmitterComponent>(entity, "ParticleEmitter")!;
      if (!emitter.active) continue;

      const config = emitter.config;

      // Handle burst emission
      if (emitter.elapsed === 0 && config.burst && config.burst > 0) {
        for (let j = 0; j < config.burst; j++) {
          this.spawnParticle(world, config);
        }
        if (!config.loop && config.rate === 0) {
            world.mutateComponent<ParticleEmitterComponent>(entity, "ParticleEmitter", e => {
                e.active = false;
            });
        }
      }

      // Handle continuous emission
      if (config.rate > 0) {
          world.mutateComponent<ParticleEmitterComponent>(entity, "ParticleEmitter", e => {
              e.elapsed += dtSeconds;
              const particlesToSpawn = Math.floor(e.elapsed * config.rate);
              for (let j = 0; j < particlesToSpawn; j++) {
                this.spawnParticle(world, config);
              }
              e.elapsed %= (1 / config.rate);
          });
      } else {
          world.mutateComponent<ParticleEmitterComponent>(entity, "ParticleEmitter", e => {
              e.elapsed += dtSeconds;
          });
      }
    }
  }

  /**
   * Static helper to emit a burst manually.
   */
  public emit(world: World, config: ParticleEmitterConfig): Entity {
    return createEmitter(world, config);
  }

  private spawnParticle(world: World, config: ParticleEmitterConfig): void {
    const renderRandom = world.renderRandom;
    const angle = renderRandom.nextRange(config.angle.min, config.angle.max) * (Math.PI / 180);
    const speed = renderRandom.nextRange(config.speed.min, config.speed.max);
    const lifetime = renderRandom.nextRange(config.lifetime.min, config.lifetime.max) * 1000;
    const size = renderRandom.nextRange(config.size.min, config.size.max);
    const color = config.color[renderRandom.nextInt(0, config.color.length)];

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
  const commands = world.getCommandBuffer();
  const entity = world.reserveEntityId();

  const component = {
    type: "ParticleEmitter",
    config,
    active: true,
    elapsed: 0,
  } as ParticleEmitterComponent;

  commands.createEntity(entity);
  commands.addComponent(entity, component);

  return entity;
}

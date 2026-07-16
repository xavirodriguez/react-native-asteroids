import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ParticleEmitterComponent, ParticleEmitterConfig, Entity, CoreComponentRegistry } from "../ecs/CoreComponents";

/** @public */
export interface ParticleParams {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  ttl: number;
}

/** @public */
export interface IPrefabPool<TParams> {
    acquire(world: any, params: TParams): Entity;
}

/** @public */
export class ParticleSystem extends System<CoreComponentRegistry> {
  private particlePool: IPrefabPool<ParticleParams>;

  constructor(particlePool: IPrefabPool<ParticleParams>) {
    super();
    this.particlePool = particlePool;
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    const emitters = world.query("ParticleEmitter");

    for (let i = 0; i < emitters.length; i++) {
      const entity = emitters[i];

      const node = world.getComponent(entity, "SpatialNode");
      if (node && node.active === false) continue;

      const emitter = world.getComponent(entity, "ParticleEmitter")!;
      if (!emitter.active) continue;

      const config = emitter.config;

      if (emitter.elapsed === 0 && config.burst) {
        for (let j = 0; j < config.count; j++) {
          this.spawnParticle(world, config);
        }
        if (!config.loop && config.rate === 0) {
            world.mutateComponent(entity, "ParticleEmitter", e => {
                e.active = false;
            });
        }
      }

      if (config.rate > 0) {
          world.mutateComponent(entity, "ParticleEmitter", e => {
              e.elapsed += deltaTime;
              const particlesToSpawn = Math.floor(e.elapsed * config.rate);
              for (let j = 0; j < particlesToSpawn; j++) {
                this.spawnParticle(world, config);
              }
              e.elapsed %= (1 / config.rate);
          });
      } else {
          world.mutateComponent(entity, "ParticleEmitter", e => {
              e.elapsed += deltaTime;
          });
      }
    }
  }

  public emit(world: World<CoreComponentRegistry>, config: ParticleEmitterConfig): Entity {
    return createEmitter(world, config);
  }

  private spawnParticle(world: World<CoreComponentRegistry>, config: ParticleEmitterConfig): void {
    const renderRandom = world.renderRandom;

    const angleRange = config.angle || [0, 360];
    const angle = renderRandom.nextRange(angleRange[0], angleRange[1]) * (Math.PI / 180);

    const speedRange = config.speed || [0, 100];
    const speed = renderRandom.nextRange(speedRange[0], speedRange[1]);

    const lifetimeRange = config.lifetime || [1, 1];
    const lifetime = renderRandom.nextRange(lifetimeRange[0], lifetimeRange[1]) * 1000;

    const sizeRange = config.size || [1, 1];
    const size = renderRandom.nextRange(sizeRange[0], sizeRange[1]);

    let color = "white";
    if (config.color) {
        if (Array.isArray(config.color)) {
            color = config.color[renderRandom.nextInt(0, config.color.length)];
        } else {
            color = config.color;
        }
    }

    let x = config.x;
    let y = config.y;

    if (config.position) {
        if (Array.isArray(config.position)) {
             x += renderRandom.nextRange(config.position[0], config.position[2]);
             y += renderRandom.nextRange(config.position[1], config.position[3]);
        } else {
             x += config.position.x;
             y += config.position.y;
        }
    }

    this.particlePool.acquire(world, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      ttl: lifetime,
    });
  }
}

/** @public */
export function createEmitter(world: World<CoreComponentRegistry>, config: ParticleEmitterConfig): Entity {
  const commands = world.getCommandBuffer();
  const entity = world.createEntity();

  const component = {
    type: "ParticleEmitter",
    config,
    active: true,
    elapsed: 0,
  } as ParticleEmitterComponent;

  commands.addComponent(entity, component);

  return entity;
}

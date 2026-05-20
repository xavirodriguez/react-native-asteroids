import { PrefabPool, PrefabConfig } from "../utils/PrefabPool";
import { World } from "../core/World";
import {
  Entity,
  Component,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  Collider2DComponent,
  TTLComponent,
  ReclaimableComponent
} from "../types/EngineTypes";

/**
 * Standard component set for a projectile.
 */
export interface ProjectileComponents extends Record<string, Component> {
  position: TransformComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  collider: Collider2DComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
}

/**
 * Standard parameters for initializing a projectile.
 */
export interface ProjectileParams {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  ttl: number;
  shape?: string;
  layer?: number;
  mask?: number;
}

/**
 * Base class for projectile pools.
 * Provides a standardized way to manage recycling of bullets and particles.
 *
 * @public
 */
export abstract class ProjectilePool<T extends ProjectileComponents = ProjectileComponents, P extends ProjectileParams = ProjectileParams>
  extends PrefabPool<T, P> {

  constructor(config: PrefabConfig<T, P>) {
    super(config);
  }

  /**
   * Acquires a projectile and initializes it with standard physical and visual properties.
   */
  public override acquire(world: World, params: P): Entity {
    return super.acquire(world, params);
  }
}

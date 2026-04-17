import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";
import { ComponentSetPool } from "./ComponentSetPool";

/**
 * Configuration for a PrefabPool.
 */
export interface PrefabConfig<T extends Record<string, Component>, I> {
  factory: () => T;
  reset: (data: T) => void;
  initializer: (components: T, params: I) => void;
  initialSize?: number;
}

/**
 * A PrefabPool provides a declarative way to manage pools of complex entities.
 * It combines an ComponentSetPool with a specific initialization logic.
 */
export class PrefabPool<T extends Record<string, Component>, I> {
  private pool: ComponentSetPool<T>;
  private initializer: (components: T, params: I) => void;

  constructor(config: PrefabConfig<T, I>) {
    this.pool = new ComponentSetPool<T>(config.factory, config.reset, config.initialSize || 0);
    this.initializer = config.initializer;
  }

  /**
   * Acquires a new entity from the pool and initializes it with the provided parameters.
   */
  public acquire(world: World, params: I): Entity {
    const { entity, components } = this.pool.acquire(world);
    this.initializer(components, params);
    return entity;
  }

  /**
   * Releases an entity back to the pool.
   */
  public release(world: World, entity: Entity): void {
    this.pool.release(world, entity);
  }

  /**
   * Current size of the underlying pool.
   */
  public get size(): number {
    return this.pool.size;
  }
}

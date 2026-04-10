import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";
import { EntityPool } from "./EntityPool";

/**
 * Configuración para un PrefabPool.
 */
export interface PrefabConfig<T extends Record<string, Component>, I> {
  /** Función fábrica que crea el conjunto inicial de componentes. */
  factory: () => T;
  /** Función que limpia el estado de los componentes antes del reciclaje. */
  reset: (data: T) => void;
  /** Función que inicializa los componentes con parámetros específicos en el momento de adquisición. */
  initializer: (components: T, params: I) => void;
  /** Tamaño inicial sugerido del pool. */
  initialSize?: number;
}

/**
 * Un PrefabPool proporciona una forma declarativa de gestionar pools de entidades complejas (prefabs).
 * Combina un `EntityPool` genérico con una lógica de inicialización específica basada en parámetros externos.
 *
 * @responsibility Gestionar el ciclo de vida de entidades pre-configuradas.
 * @responsibility Reducir la sobrecarga de asignación de memoria mediante el reciclaje de componentes.
 *
 * @remarks
 * Es ideal para partículas, proyectiles o cualquier entidad de corta duración que se cree frecuentemente.
 *
 * @conceptualRisk [COMPONENT_MISMATCH][LOW] Si la factoría crea un conjunto de componentes pero
 * el inicializador intenta acceder a otros no declarados, se producirán errores en tiempo de ejecución.
 */
export class PrefabPool<T extends Record<string, Component>, I> {
  private pool: EntityPool<T>;
  private initializer: (components: T, params: I) => void;

  constructor(config: PrefabConfig<T, I>) {
    this.pool = new EntityPool<T>(config.factory, config.reset, config.initialSize || 0);
    this.initializer = config.initializer;
  }

  /**
   * Adquiere una entidad nueva del pool y la inicializa con los parámetros proporcionados.
   *
   * @param world - El mundo ECS donde se activará la entidad.
   * @param params - Parámetros de inicialización (e.g., posición, color).
   * @returns La ID de la entidad activada.
   *
   * @invariant La entidad retornada ya contiene todos los componentes definidos en la factoría.
   */
  public acquire(world: World, params: I): Entity {
    const { entity, components } = this.pool.acquire(world);
    this.initializer(components, params);
    return entity;
  }

  /**
   * Libera una entidad de vuelta al pool para su futuro reciclaje.
   *
   * @sideEffect Elimina la entidad del mundo ECS y limpia sus componentes mediante la función `reset`.
   */
  public release(world: World, entity: Entity): void {
    this.pool.release(world, entity);
  }

  /**
   * Tamaño actual del pool subyacente (objetos inactivos listos para reuso).
   */
  public get size(): number {
    return this.pool.size;
  }
}

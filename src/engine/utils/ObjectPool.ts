/**
 * Pool de objetos genérico para reutilizar instancias y reducir la presión sobre el recolector de basura (GC).
 *
 * @responsibility Minimizar las asignaciones de memoria dinámicas en el bucle principal.
 * @responsibility Garantizar un estado limpio en los objetos mediante funciones de reset.
 *
 * @remarks
 * Principio 6: Propiedad y Reset del ObjectPool.
 * - `reset` se llama ANTES del reuso en `acquire()`.
 * - `reset` se llama antes de liberar en `release()` para evitar fugas de referencias.
 *
 * @conceptualRisk [MUTABLE_REFERENCE][MEDIUM] `acquire()` retorna una referencia mutable;
 * si el llamador mantiene la referencia después de liberar el objeto, puede corromper estados futuros.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Adquiere un objeto del pool o crea uno nuevo si está vacío.
   * Reinicia el objeto antes de retornarlo para garantizar un estado consistente.
   *
   * @returns Una instancia de T lista para ser poblada.
   * @invariant El objeto retornado ha pasado por la función `reset`.
   */
  public acquire(): T {
    const obj = this.pool.pop() || this.factory();
    this.reset(obj);
    return obj;
  }

  /**
   * Principle 6: Retorna copias congeladas (frozen) de todos los items en el pool en modo desarrollo,
   * para prevenir mutaciones accidentales de memoria pooled.
   *
   * @returns Un array con todos los objetos inactivos del pool.
   */
  public consume(): T[] {
    const items = this.pool.map(obj => ({ ...obj }) as T);

    if (__DEV__) {
      return items.map(obj => Object.freeze(obj));
    }

    return items;
  }

  /**
   * Libera un objeto de vuelta al pool.
   * Reinicia el objeto antes de almacenarlo para evitar mantener referencias a otros objetos.
   *
   * @param obj - El objeto a reciclar.
   */
  public release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  /**
   * Cantidad de objetos actualmente disponibles en el pool.
   */
  public get size(): number {
    return this.pool.length;
  }
}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";

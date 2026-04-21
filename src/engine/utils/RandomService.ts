/**
 * Servicio de aleatoriedad determinista (PRNG).
 * Proporciona instancias segregadas para simulación y efectos visuales para prevenir
 * la deriva de la semilla (seed drift).
 *
 * @responsibility Proveer números aleatorios reproducibles basados en semillas.
 * @responsibility Segregar el estado del PRNG entre simulación y presentación.
 *
 * @remarks
 * Es imperativo utilizar `getInstance("gameplay")` para cualquier lógica que afecte
 * el estado del juego (IA, spawn, daño) para garantizar determinismo y soporte de replay.
 * Para efectos puramente estéticos (partículas, flashes), se debe usar `getInstance("render")`.
 *
 * @invariant Dos instancias con la misma semilla y el mismo número de llamadas a next() deben
 * retornar exactamente la misma secuencia de valores.
 * @conceptualRisk [SEED_COLLISION] El uso de la misma semilla en múltiples instancias "named"
 * no coordinadas puede resultar en patrones de aleatoriedad idénticos.
 */
export class RandomService {
  private static globalInstance: RandomService = new RandomService(12345);
  private static namedInstances: Map<string, RandomService> = new Map();
  public static lockGameplayContext: boolean = false;

  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  /**
   * Returns a named instance of the RandomService, creating it if it doesn't exist.
   */
  public static getInstance(name: string = "global", initialSeed: number = 12345): RandomService {
    if (this.lockGameplayContext && name === "render") {
        console.error("[RandomService] Accessing 'render' instance during gameplay simulation! This will break determinism.");
        throw new Error("Deterministic violation: 'render' random accessed during simulation.");
    }

    if (name === "global") return this.globalInstance;

    let instance = this.namedInstances.get(name);
    if (!instance) {
      instance = new RandomService(initialSeed);
      this.namedInstances.set(name, instance);
    }
    return instance;
  }

  /**
   * Sets the seed for the global instance.
   */
  public static setSeed(newSeed: number): void {
    this.globalInstance.setSeed(newSeed);
  }

  /**
   * Sets the seed for this specific instance.
   */
  public setSeed(newSeed: number): void {
    this.seed = newSeed;
  }

  /**
   * Gets the current seed of this instance.
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Static helper for the global instance.
   */
  public static next(): number {
    return this.globalInstance.next();
  }

  /**
   * Static helper for the global instance.
   */
  public static nextRange(min: number, max: number): number {
    return this.globalInstance.nextRange(min, max);
  }

  /**
   * Static helper for the global instance.
   */
  public static chance(probability: number): boolean {
    return this.globalInstance.chance(probability);
  }

  /**
   * Static helper for the global instance.
   */
  public static nextInt(min: number, max: number): number {
    return this.globalInstance.nextInt(min, max);
  }

  /**
   * Static helper for the global instance.
   */
  public static nextSign(): number {
    return this.globalInstance.nextSign();
  }

  /**
   * Genera un número aleatorio de punto flotante en el rango [0, 1).
   * Utiliza el algoritmo Mulberry32 para garantizar determinismo.
   *
   * @remarks
   * Cada llamada muta la semilla interna de la instancia.
   *
   * @responsibility Proveer números aleatorios reproducibles basados en semillas.
   * @responsibility Segregar el estado del PRNG entre simulación y presentación.
   *
   * @returns Un valor aleatorio entre 0 (inclusive) y 1 (exclusive).
   * @sideEffect Muta `this.seed`.
   * @invariant El mismo estado inicial (semilla) produce siempre la misma secuencia.
   */
  public next(): number {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random float between min and max.
   */
  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a random integer between min (inclusive) and max (exclusive).
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max));
  }

  /**
   * Returns true or false based on a probability (0 to 1).
   */
  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Returns -1 or 1 randomly.
   */
  public nextSign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}

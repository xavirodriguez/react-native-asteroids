/**
 * Servicio de aleatoriedad destinado a mejorar la reproducibilidad (PRNG).
 * Proporciona instancias segregadas para simulación y efectos visuales para ayudar a mitigar
 * la deriva de la semilla (seed drift).
 *
 * @responsibility Proveer números aleatorios basados en semillas bajo condiciones controladas.
 * @responsibility Segregar el estado del PRNG entre simulación y presentación.
 *
 * @remarks
 * Se recomienda utilizar `getGameplayRandom()` para lógica que afecte el estado del juego (IA, spawn, daño)
 * para favorecer la reproducibilidad y el soporte de replay. Para efectos puramente estéticos
 * (partículas, flashes), se sugiere el uso de `getRenderRandom()`.
 * @conceptualRisk [SEED_COLLISION] El uso de la misma semilla en múltiples instancias "named"
 * no coordinadas puede resultar en patrones de aleatoriedad idénticos.
 */

export type RandomStream = "gameplay" | "render" | "global";

export class RandomService {
  private static globalInstance: RandomService = new RandomService(12345);
  private static namedInstances: Map<string, RandomService> = new Map();
  public static lockGameplayContext: boolean = false;

  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  /**
   * Helper prioritario para obtener el stream de gameplay.
   * Úselo en sistemas de simulación, IA, física y lógica autoritativa.
   */
  public static getGameplayRandom(): RandomService {
    return this.getInstance("gameplay");
  }

  /**
   * Helper prioritario para obtener el stream de renderizado.
   * Úselo para partículas, sacudidas de cámara y efectos visuales no autoritativos.
   */
  public static getRenderRandom(): RandomService {
    return this.getInstance("render");
  }

  /**
   * Returns a named instance of the RandomService, creating it if it doesn't exist.
   *
   * @throws {Error} Si se intenta acceder a "render" o "global" mientras lockGameplayContext es true.
   */
  public static getInstance(name: RandomStream = "global", initialSeed: number = 12345): RandomService {
    if (this.lockGameplayContext && (name === "render" || name === "global")) {
        const errorMsg = `[RandomService] Accessing '${name}' instance during gameplay simulation! This will break determinism. Use getGameplayRandom() instead.`;
        console.error(errorMsg);
        throw new Error(`Deterministic violation: '${name}' random accessed during simulation.`);
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
   * Verifica si el acceso estático está permitido en el contexto actual.
   */
  private static checkStaticAccess(method: string): void {
    if (this.lockGameplayContext) {
      const errorMsg = `[RandomService] Static method '${method}' accessed during gameplay simulation! This uses the 'global' stream and will break determinism. Use getGameplayRandom().${method}(...) instead.`;
      console.error(errorMsg);
      throw new Error(`Deterministic violation: Static ${method} accessed during simulation.`);
    }
  }

  /**
   * Sets the seed for the global instance.
   * @deprecated Use getGameplayRandom().setSeed(seed) or getRenderRandom().setSeed(seed).
   */
  public static setSeed(newSeed: number): void {
    this.checkStaticAccess("setSeed");
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
   * @deprecated Use getGameplayRandom().next() or getRenderRandom().next().
   */
  public static next(): number {
    this.checkStaticAccess("next");
    return this.globalInstance.next();
  }

  /**
   * Static helper for the global instance.
   * @deprecated Use getGameplayRandom().nextRange() or getRenderRandom().nextRange().
   */
  public static nextRange(min: number, max: number): number {
    this.checkStaticAccess("nextRange");
    return this.globalInstance.nextRange(min, max);
  }

  /**
   * Static helper for the global instance.
   * @deprecated Use getGameplayRandom().chance() or getRenderRandom().chance().
   */
  public static chance(probability: number): boolean {
    this.checkStaticAccess("chance");
    return this.globalInstance.chance(probability);
  }

  /**
   * Static helper for the global instance.
   * @deprecated Use getGameplayRandom().nextInt() or getRenderRandom().nextInt().
   */
  public static nextInt(min: number, max: number): number {
    this.checkStaticAccess("nextInt");
    return this.globalInstance.nextInt(min, max);
  }

  /**
   * Static helper for the global instance.
   * @deprecated Use getGameplayRandom().nextSign() or getRenderRandom().nextSign().
   */
  public static nextSign(): number {
    this.checkStaticAccess("nextSign");
    return this.globalInstance.nextSign();
  }

  /**
   * Genera un número aleatorio de punto flotante en el rango [0, 1).
   * Utiliza el algoritmo Mulberry32 buscando ofrecer un comportamiento reproducible en la misma plataforma.
   *
   * @remarks
   * Cada llamada actualiza la semilla interna de la instancia.
   *
   * @returns Un valor aleatorio entre 0 (inclusive) y 1 (exclusive).
   * @sideEffect Actualiza `this.seed`.
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

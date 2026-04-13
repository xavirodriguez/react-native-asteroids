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
 *
 * @packageDocumentation
 */
export declare class RandomService {
    private static globalInstance;
    private static namedInstances;
    private seed;
    constructor(seed?: number);
    /**
     * Returns a named instance of the RandomService, creating it if it doesn't exist.
     */
    static getInstance(name?: string, initialSeed?: number): RandomService;
    /**
     * Sets the seed for the global instance.
     */
    static setSeed(newSeed: number): void;
    /**
     * Sets the seed for this specific instance.
     */
    setSeed(newSeed: number): void;
    /**
     * Static helper for the global instance.
     */
    static next(): number;
    /**
     * Static helper for the global instance.
     */
    static nextRange(min: number, max: number): number;
    /**
     * Static helper for the global instance.
     */
    static chance(probability: number): boolean;
    /**
     * Static helper for the global instance.
     */
    static nextInt(min: number, max: number): number;
    /**
     * Static helper for the global instance.
     */
    static nextSign(): number;
    /**
     * Genera un número aleatorio de punto flotante en el rango [0, 1).
     * Utiliza el algoritmo Mulberry32 para garantizar determinismo.
     *
     * @remarks
     * Cada llamada muta la semilla interna de la instancia.
     *
     * @returns Un valor aleatorio entre 0 (inclusive) y 1 (exclusive).
     * @sideEffect Muta `this.seed`.
     * @invariant El mismo estado inicial (semilla) produce siempre la misma secuencia.
     */
    next(): number;
    /**
     * Generates a random float between min and max.
     */
    nextRange(min: number, max: number): number;
    /**
     * Generates a random integer between min (inclusive) and max (exclusive).
     */
    nextInt(min: number, max: number): number;
    /**
     * Returns true or false based on a probability (0 to 1).
     */
    chance(probability: number): boolean;
    /**
     * Returns -1 or 1 randomly.
     */
    nextSign(): number;
}

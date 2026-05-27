
export type GameLoopListener = (deltaTime: number) => void;
export type RenderListener = (alpha: number, deltaTime: number) => void;

export interface GameLoopConfig {
  maxDeltaMs?: number;
  /** Límite máximo de actualizaciones de simulación permitidas por frame real. */
  maxUpdatesPerFrame?: number;
}

/**
 * Central time manager orchestrating the game's lifecycle.
 *
 * @remarks
 * Implements a **Fixed Timestep / Variable Rendering** scheme with interpolation,
 * intended to support simulation consistency and visual smoothness.
 *
 * The loop attempts to decouple simulation logic from the device's refresh rate,
 * which may help mitigate the impact of performance fluctuations on physical integrity.
 * Under high load conditions, the system may limit updates to preserve environment stability.
 *
 * **Precision**: The simulation phase is configured to target constant increments of
 * 16.67ms (1/60s). In practice, real-world precision is subject to environment
 * constraints such as the JavaScript Event Loop, `performance.now()` variability,
 * and system load. Consistency across different devices is intended but cannot be
 * guaranteed.
 *
 * @conceptualRisk [PERFORMANCE] The loop may encounter a "Spiral of Death" if the
 * simulation is consistently slower than real-time. A safety mechanism
 * (`maxUpdatesPerFrame`) is included to mitigate this risk by dropping simulation
 * ticks, which may affect temporal accuracy and reproducibility under extreme load.
 */
export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  /**
   * Retrieves the current time accumulator.
   */
  public getAccumulator(): number { return this.accumulator; }
  /**
   * Restores the time accumulator from a snapshot.
   */
  public setAccumulator(val: number): void { this.accumulator = val; }

  private readonly fixedDeltaTime = 1000 / 60; // 60 FPS simulación
  private readonly maxDeltaMs: number;
  private readonly maxUpdatesPerFrame: number;

  private inputListeners = new Set<GameLoopListener>();
  private updateListeners = new Set<GameLoopListener>();
  private transformListeners = new Set<GameLoopListener>();
  private renderListeners = new Set<RenderListener>();

  // Temporary arrays for safe iteration during concurrent modification
  private activeUpdateListeners: GameLoopListener[] = [];
  private needsUpdateRebuild = true;

  constructor(config: GameLoopConfig = {}) {
    this.maxDeltaMs = config.maxDeltaMs ?? 100;
    this.maxUpdatesPerFrame = config.maxUpdatesPerFrame ?? 240; // Evita el Spiral of Death
  }

  /**
   * Subscribes a callback to the Input phase.
   *
   * @remarks
   * Executes once per frame (variable step), before the physical simulation.
   * Typically used for capturing keyboard or pointer states to be processed in the next tick.
   *
   * @param listener - Function receiving the current frame's deltaTime.
   * @returns A function to unsubscribe.
   */
  public subscribeInput(listener: GameLoopListener): () => void {
    this.inputListeners.add(listener);
    return () => this.inputListeners.delete(listener);
  }

  /**
   * Subscribes a callback to the physical simulation phase (Fixed Update).
   *
   * @remarks
   * This phase is oriented towards simulation consistency. The system attempts to maintain a
   * constant time increment (16.67ms) for the callback. Depending on elapsed time,
   * it may execute multiple times in a single environment frame.
   *
   * To prevent main thread blocking, the number of updates per frame is limited by
   * `maxUpdatesPerFrame`. If this limit is reached, remaining ticks for that frame
   * are dropped, which may affect temporal accuracy and reproducibility in favor of
   * environment stability.
   *
   * @param listener - Function receiving the fixedDeltaTime (16.67ms).
   * @returns A function to unsubscribe.
   */
  public subscribeUpdate(listener: GameLoopListener): () => void {
    this.updateListeners.add(listener);
    this.needsUpdateRebuild = true;
    return () => {
      this.updateListeners.delete(listener);
      this.needsUpdateRebuild = true;
    };
  }

  /**
   * Subscribes a callback to the hierarchical transformation propagation phase.
   *
   * @remarks
   * Executes once per browser frame, immediately after all required simulation
   * ticks for that frame have finished. This is the intended location for the
   * {@link HierarchySystem}.
   *
   * @param listener - Callback function.
   * @returns Unsubscribe function.
   */
  public subscribeTransform(listener: GameLoopListener): () => void {
    this.transformListeners.add(listener);
    return () => this.transformListeners.delete(listener);
  }

  /**
   * Subscribes a callback to the Presentation (Render) phase.
   *
   * @remarks
   * Executes once per environment frame. Receives an `alpha` factor (0.0 to 1.0)
   * indicating the fraction of the fixed tick remaining in the accumulator,
   * allowing for visual interpolation intended to achieve smoother motion.
   *
   * @param listener - Function receiving `alpha` and `deltaTime`.
   * @returns Unsubscribe function.
   */
  public subscribeRender(listener: RenderListener): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  /**
   * Inicia la ejecución del loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  /**
   * Detiene el loop.
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Main execution loop coordinated with `requestAnimationFrame`.
   *
   * @remarks
   * Implements a **Time Accumulator** algorithm:
   * 1. Calculates `deltaTime` capped by `maxDeltaMs` to help prevent excessive jumps.
   * 2. Adds `deltaTime` to the `accumulator`.
   * 3. Attempts to execute the simulation phase in fixed steps (16.67ms) as long as the accumulator allows.
   * 4. Calculates `alpha` as the remaining time fraction for visual interpolation.
   *
   * While this system is designed to support reproducibility, external factors
   * in the JavaScript environment and hardware may introduce variations in behavior.
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min(currentTime - this.lastTime, this.maxDeltaMs);
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // 1. Input Phase (Variable Step)
    this.inputListeners.forEach(listener => listener(deltaTime));

    // 2. Simulation Phase (Fixed Step)
    let updatesThisFrame = 0;
    while (this.accumulator >= this.fixedDeltaTime) {
      if (updatesThisFrame >= this.maxUpdatesPerFrame) {
        /**
         * Warning: Spiral of Death detected.
         * Se descarta el tiempo acumulado sobrante con la intención de mitigar el riesgo de bloqueo del hilo principal.
         * En la práctica, esto sacrifica la precisión temporal y el determinismo en favor de la estabilidad del entorno.
         */
        console.warn(`[GameLoop] Spiral of Death detected. Dropping remaining ticks for this frame to preserve stability. (Updates: ${updatesThisFrame})`);
        this.accumulator = 0;
        break;
      }

      // Determinism: ensure RNG is seeded for this tick if needed
      // RandomService.getInstance("gameplay"); // Static access is deprecated

      if (this.needsUpdateRebuild) {
        this.activeUpdateListeners = Array.from(this.updateListeners);
        this.needsUpdateRebuild = false;
      }

      for (let i = 0; i < this.activeUpdateListeners.length; i++) {
        this.activeUpdateListeners[i](this.fixedDeltaTime);
      }

      this.accumulator -= this.fixedDeltaTime;
      updatesThisFrame++;
    }

    // 3. Transform Phase (after simulation, before render)
    this.transformListeners.forEach(listener => listener(deltaTime));

    // 4. Render Phase (Variable Step with alpha interpolation)
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach(listener => listener(alpha, deltaTime));

    requestAnimationFrame(this.loop);
  };
}

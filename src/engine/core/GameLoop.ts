import { RandomService } from "../utils/RandomService";

export type GameLoopListener = (deltaTime: number) => void;
export type RenderListener = (alpha: number, deltaTime: number) => void;

export interface GameLoopConfig {
  maxDeltaMs?: number;
}

/**
 * Motor de tiempo central que orquesta el ciclo de vida del juego.
 * implementa un Fixed Timestep con interpolación para garantizar un comportamiento determinista.
 *
 * @responsibility Mantener una tasa de actualización constante (60Hz) para la simulación física.
 * @responsibility Calcular el factor de interpolación (alpha) para el renderizado visual.
 * @responsibility Notificar a los suscriptores en las fases de Input, Update y Render.
 *
 * @remarks
 * El determinismo es fundamental para el soporte de rollback y repeticiones.
 * El loop separa la lógica de simulación de la tasa de refresco del monitor.
 *
 * @contract Fixed Update: Se garantiza que la fase de simulación siempre reciba incrementos de 16.67ms (1/60s).
 */
export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDeltaTime = 1000 / 60; // 60 FPS simulación
  private readonly maxDeltaMs: number;

  private inputListeners = new Set<GameLoopListener>();
  private updateListeners = new Set<GameLoopListener>();
  private transformListeners = new Set<GameLoopListener>();
  private renderListeners = new Set<RenderListener>();

  // Temporary arrays for safe iteration during concurrent modification
  private activeUpdateListeners: GameLoopListener[] = [];
  private needsUpdateRebuild = true;

  constructor(config: GameLoopConfig = {}) {
    this.maxDeltaMs = config.maxDeltaMs ?? 100;
  }

  /**
   * Suscribe un callback para la fase de entrada (Input).
   * Se ejecuta una vez por cada frame del navegador.
   */
  public subscribeInput(listener: GameLoopListener): () => void {
    this.inputListeners.add(listener);
    return () => this.inputListeners.delete(listener);
  }

  /**
   * Suscribe un callback para la simulación física (Fixed Update).
   * Puede ejecutarse cero, una o varias veces por frame del navegador.
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
   * Suscribe un callback para la propagación de transformaciones jerárquicas.
   * Se ejecuta después de la simulación y antes del renderizado.
   */
  public subscribeTransform(listener: GameLoopListener): () => void {
    this.transformListeners.add(listener);
    return () => this.transformListeners.delete(listener);
  }

  /**
   * Suscribe un callback para la fase de presentación (Render).
   * Se ejecuta una vez por cada frame del navegador con el factor de interpolación alpha.
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

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min(currentTime - this.lastTime, this.maxDeltaMs);
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // 1. Input Phase (Variable Step)
    this.inputListeners.forEach(listener => listener(deltaTime));

    // 2. Simulation Phase (Fixed Step)
    while (this.accumulator >= this.fixedDeltaTime) {
      // Determinism: ensure RNG is seeded for this tick if needed
      RandomService.getInstance("gameplay");

      if (this.needsUpdateRebuild) {
        this.activeUpdateListeners = Array.from(this.updateListeners);
        this.needsUpdateRebuild = false;
      }

      for (let i = 0; i < this.activeUpdateListeners.length; i++) {
        this.activeUpdateListeners[i](this.fixedDeltaTime);
      }

      this.accumulator -= this.fixedDeltaTime;
    }

    // 3. Transform Phase (after simulation, before render)
    this.transformListeners.forEach(listener => listener(deltaTime));

    // 4. Render Phase (Variable Step with alpha interpolation)
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach(listener => listener(alpha, deltaTime));

    requestAnimationFrame(this.loop);
  };
}

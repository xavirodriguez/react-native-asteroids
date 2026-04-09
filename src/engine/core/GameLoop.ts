/**
 * Gestiona el latido del juego y las actualizaciones de los sistemas usando un timestep fijo.
 *
 * @remarks
 * Implementa un patrón de acumulador para garantizar actualizaciones de lógica y física
 * consistentes (por defecto a 60 FPS), independientemente de la tasa de refresco del renderizado.
 * Esto es crítico para el determinismo y la estabilidad de las simulaciones físicas.
 */

export interface LoopConfig {
  fixedHz?: number; // default: 60
  maxDeltaMs?: number; // default: 100 (evita spiral of death)
}

export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private gameLoopId?: number;
  private accumulator: number = 0;

  /** Fixed timestep for logic updates (60 FPS = 16.66ms) */
  private fixedDeltaTime: number = 1000 / 60;
  /** Maximum elapsed time allowed in a single frame to prevent "spiral of death" */
  private maxDeltaTime: number = 100;

  private updateListeners: Set<(deltaTime: number) => void> = new Set();
  private renderListeners: Set<(alpha: number, deltaTime: number) => void> = new Set();

  constructor(config: LoopConfig = {}) {
    // Principle 8: Defensive constructor with destructuring and defaults
    const { fixedHz = 60, maxDeltaMs = 100 } = config;
    this.fixedDeltaTime = 1000 / fixedHz;
    this.maxDeltaTime = maxDeltaMs;
  }

  /**
   * Inicia el bucle de juego.
   *
   * @remarks
   * Utiliza `requestAnimationFrame` para sincronizarse con la tasa de refresco del monitor.
   * Inicializa el acumulador y el tiempo de referencia.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoopId = requestAnimationFrame(this.loop);
  }

  /**
   * Detiene el bucle de juego y cancela el siguiente frame programado.
   */
  public stop(): void {
    if (this.gameLoopId !== undefined) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
    this.isRunning = false;
  }

  /**
   * Suscribe un listener a la fase de actualización (fixed timestep).
   *
   * @remarks
   * Esta fase se ejecuta a una frecuencia constante (e.g., 60Hz). Es el lugar adecuado
   * para lógica de juego, física e IA.
   *
   * @param listener - Función callback que recibe el deltaTime fijo en milisegundos.
   * @returns Función para cancelar la suscripción.
   */
  public subscribeUpdate(listener: (deltaTime: number) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  /**
   * Suscribe un listener a la fase de renderizado (framerate variable).
   *
   * @remarks
   * Esta fase se ejecuta tan rápido como el navegador/dispositivo permita.
   * Recibe un valor `alpha` que representa la fracción de tiempo transcurrido entre
   * el último tick fijo y el siguiente, útil para interpolación visual.
   *
   * @param listener - Callback que recibe alpha (0-1) y el deltaTime real.
   * @returns Función para cancelar la suscripción.
   */
  public subscribeRender(listener: (alpha: number, deltaTime: number) => void): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  /**
   * Legacy subscribe method for backward compatibility.
   * Maps to render subscription.
   */
  public subscribe(listener: (alpha: number, deltaTime: number) => void): () => void {
    return this.subscribeRender(listener);
  }

  /**
   * The main loop execution.
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap delta time to prevent spiral of death
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime;
    }

    this.accumulator += deltaTime;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedDeltaTime) {
      this.updateListeners.forEach((listener) => listener(this.fixedDeltaTime));
      this.accumulator -= this.fixedDeltaTime;
    }

    // Render phase with alpha interpolation
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach((listener) => listener(alpha, deltaTime));

    this.gameLoopId = requestAnimationFrame(this.loop);
  };
}

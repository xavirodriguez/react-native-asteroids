import { RandomService } from "../utils/RandomService";

export type GameLoopListener = (deltaTime: number) => void;
export type RenderListener = (alpha: number, deltaTime: number) => void;

export interface GameLoopConfig {
  maxDeltaMs?: number;
  /** Límite máximo de actualizaciones de simulación permitidas por frame real. */
  maxUpdatesPerFrame?: number;
}

/**
 * Motor de tiempo central que orquesta el ciclo de vida del juego.
 * Implementa un Fixed Timestep con interpolación diseñado para favorecer la reproducibilidad y la fluidez.
 *
 * @responsibility Apuntar a una tasa de actualización constante (60Hz) para la simulación física.
 * @responsibility Calcular el factor de interpolación (alpha) para el renderizado visual.
 * @responsibility Notificar a los suscriptores en las fases de Input, Update y Render.
 *
 * @remarks
 * El loop desacopla la lógica de simulación de la tasa de refresco del monitor, con la intención de que
 * variaciones en el rendimiento del renderizado reduzcan su impacto en la integridad de la física.
 * Bajo carga extrema, el sistema puede limitar las actualizaciones para preservar la estabilidad del hilo principal.
 *
 * @remarks La fase de simulación está diseñada para recibir incrementos constantes de 16.67ms (1/60s) bajo condiciones operativas normales.
 *
 * @conceptualRisk [PERFORMANCE][HIGH] El loop de `GameLoop` puede disparar el "Spiral of Death"
 * si la simulación es consistentemente más lenta que el tiempo real, a pesar del límite `maxDeltaMs`.
 */
export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
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
   * Suscribe un callback para la fase de entrada (Input).
   *
   * @remarks
   * Se ejecuta una vez por cada frame del navegador (variable step), antes de la simulación física.
   * Útil para capturar estados de teclado o puntero que deben ser procesados en el siguiente tick.
   *
   * @param listener - Función que recibe el deltaTime del frame actual.
   * @returns Una función para cancelar la suscripción.
   */
  public subscribeInput(listener: GameLoopListener): () => void {
    this.inputListeners.add(listener);
    return () => this.inputListeners.delete(listener);
  }

  /**
   * Suscribe un callback para la simulación física (Fixed Update).
   *
   * @remarks
   * Esta fase está orientada a la reproducibilidad de la simulación. El sistema está diseñado con la intención de que
   * el callback reciba un incremento de tiempo constante (16.67ms). Puede ejecutarse múltiples veces
   * en un solo frame del navegador para compensar el tiempo transcurrido, hasta un límite máximo
   * definido en la configuración para evitar bloqueos.
   *
   * @param listener - Función que recibe el fixedDeltaTime (16.67ms).
   * @returns Una función para cancelar la suscripción.
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
   *
   * @remarks
   * Se ejecuta una vez por frame del navegador, inmediatamente después de que todos los
   * ticks de simulación necesarios para ese frame hayan terminado.
   * Es el lugar ideal para el {@link HierarchySystem}.
   *
   * @param listener - Función de callback.
   * @returns Función de cancelación.
   */
  public subscribeTransform(listener: GameLoopListener): () => void {
    this.transformListeners.add(listener);
    return () => this.transformListeners.delete(listener);
  }

  /**
   * Suscribe un callback para la fase de presentación (Render).
   *
   * @remarks
   * Se ejecuta una vez por cada frame del navegador. Recibe un factor `alpha` que indica
   * cuánto tiempo del acumulador queda pendiente respecto al tick fijo, permitiendo
   * realizar interpolación visual para un movimiento suave.
   *
   * @param listener - Función que recibe `alpha` (0.0 a 1.0) y `deltaTime`.
   * @returns Función de cancelación.
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
    let updatesThisFrame = 0;
    while (this.accumulator >= this.fixedDeltaTime) {
      if (updatesThisFrame >= this.maxUpdatesPerFrame) {
        /**
         * @warning Spiral of Death detected.
         * Se descarta el tiempo acumulado sobrante para mitigar el bloqueo del hilo principal.
         * Esto sacrifica la precisión temporal absoluta en favor de la estabilidad del entorno.
         */
        console.warn(`[GameLoop] Spiral of Death detected. Dropping remaining ticks for this frame. (Updates: ${updatesThisFrame})`);
        this.accumulator = 0;
        break;
      }

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

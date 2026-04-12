export interface LoopConfig {
  fixedHz?: number;
  maxDeltaMs?: number;
}

/**
 * Motor de ciclo de juego determinista basado en un paso de tiempo fijo (fixed timestep).
 *
 * @remarks
 * Implementa el patrón "Fix Your Timestep" con acumulador para garantizar que la simulación
 * física y la lógica de juego sean independientes de la tasa de refresco (FPS) del dispositivo.
 *
 * El pipeline se divide en:
 * 1. **Fase de Simulación**: Ejecuta listeners de `update` a una frecuencia fija (ej: 60Hz).
 * 2. **Fase de Presentación**: Ejecuta listeners de `render` en cada frame disponible,
 * proporcionando un valor `alpha` para interpolación visual entre estados de simulación.
 *
 * @conceptualRisk [SPIRAL_OF_DEATH][HIGH] Si el tiempo de procesamiento de un frame supera el
 * `maxDeltaMs`, el acumulador se trunca. Esto evita bloqueos infinitos pero ralentiza el juego
 * ("slow-motion") en lugar de intentar recuperar frames perdidos.
 *
 * @packageDocumentation
 */
export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private gameLoopId?: number;
  private accumulator: number = 0;

  private fixedDeltaTime: number = 1000 / 60;
  private maxDeltaTime: number = 100;

  private updateListeners: Set<(deltaTime: number) => void> = new Set();
  private renderListeners: Set<(alpha: number, deltaTime: number) => void> = new Set();

  /**
   * Inicializa una nueva instancia del loop de juego.
   *
   * @param config - Configuración de frecuencia y límites.
   */
  constructor(config: LoopConfig = {}) {
    const { fixedHz = 60, maxDeltaMs = 100 } = config;
    this.fixedDeltaTime = 1000 / fixedHz;
    this.maxDeltaTime = maxDeltaMs;
  }

  /**
   * Inicia la ejecución del loop de juego.
   *
   * @remarks
   * Utiliza `requestAnimationFrame` para sincronizarse con el refresco de pantalla.
   * Resetea el acumulador para evitar saltos temporales tras pausas prolongadas.
   *
   * @precondition El loop no debe estar ya en ejecución.
   * @postcondition {@link GameLoop.isRunning} es `true`.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoopId = requestAnimationFrame(this.loop);
  }

  /**
   * Detiene el loop de juego y cancela el próximo frame programado.
   *
   * @postcondition {@link GameLoop.isRunning} es `false`.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.gameLoopId !== undefined) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
  }

  /**
   * Registra un callback para la fase de simulación de tiempo fijo.
   *
   * @param listener - Función que recibe el `fixedDeltaTime` en milisegundos.
   * @returns Función de desuscripción.
   */
  public subscribeUpdate(listener: (deltaTime: number) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  /**
   * Registra un callback para la fase de renderizado de tiempo variable.
   *
   * @param listener - Función que recibe el factor de interpolación `alpha` [0, 1] y
   * el `deltaTime` real del frame.
   * @returns Función de desuscripción.
   */
  public subscribeRender(listener: (alpha: number, deltaTime: number) => void): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  /**
   * Núcleo del motor de tiempo. Gestiona la acumulación y el despacho de eventos.
   *
   * @param currentTime - Marca de tiempo proporcionada por `requestAnimationFrame`.
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap deltaTime to avoid "Spiral of Death"
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime;
    }

    this.accumulator += deltaTime;

    // 1. Fixed Step Update Phase
    while (this.accumulator >= this.fixedDeltaTime) {
      this.updateListeners.forEach((listener) => listener(this.fixedDeltaTime));
      this.accumulator -= this.fixedDeltaTime;
    }

    // 2. Variable Step Render Phase (Alpha Interpolation)
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach((listener) => listener(alpha, deltaTime));

    if (this.isRunning) {
      this.gameLoopId = requestAnimationFrame(this.loop);
    }
  };
}

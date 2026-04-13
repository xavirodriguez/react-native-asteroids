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
export declare class GameLoop {
    private isRunning;
    private lastTime;
    private gameLoopId?;
    private accumulator;
    private fixedDeltaTime;
    private maxDeltaTime;
    private updateListeners;
    private renderListeners;
    /**
     * Inicializa una nueva instancia del loop de juego.
     *
     * @param config - Configuración de frecuencia y límites.
     */
    constructor(config?: LoopConfig);
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
    start(): void;
    /**
     * Detiene el loop de juego y cancela el próximo frame programado.
     *
     * @postcondition {@link GameLoop.isRunning} es `false`.
     */
    stop(): void;
    /**
     * Registra un callback para la fase de simulación de tiempo fijo.
     *
     * @param listener - Función que recibe el `fixedDeltaTime` en milisegundos.
     * @returns Función de desuscripción.
     */
    subscribeUpdate(listener: (deltaTime: number) => void): () => void;
    /**
     * Registra un callback para la fase de renderizado de tiempo variable.
     *
     * @param listener - Función que recibe el factor de interpolación `alpha` [0, 1] y
     * el `deltaTime` real del frame.
     * @returns Función de desuscripción.
     */
    subscribeRender(listener: (alpha: number, deltaTime: number) => void): () => void;
    /**
     * Núcleo del motor de tiempo. Gestiona la acumulación y el despacho de eventos.
     *
     * @param currentTime - Marca de tiempo proporcionada por `requestAnimationFrame`.
     */
    private loop;
}

import { World } from "../core/World";
import { System } from "../core/System";
import { InputAction } from "../types/EngineTypes";
/**
 * Sistema de entrada unificado que gestiona bindings de teclado y táctiles.
 * Mapea entradas crudas a acciones semánticas en un singleton `InputStateComponent`.
 *
 * @responsibility Traducir eventos de hardware (teclado, puntero) a acciones abstractas del juego.
 * @responsibility Mantener el componente singleton `InputState` actualizado en el `World`.
 * @responsibility Permitir la inyección manual de estados mediante overrides para red y UI.
 *
 * @remarks
 * El sistema permite desacoplar la lógica del juego de los dispositivos de hardware.
 * Soporta bindings de teclas, gestos táctiles, ejes (como joysticks virtuales) y
 * permite forzar estados mediante `overrides` (útil para red o UI).
 */
export declare class UnifiedInputSystem extends System {
    private bindings;
    private axisBindings;
    private overrides;
    private activeKeys;
    private activeTouches;
    private _onKeyDown;
    private _onKeyUp;
    private _onPointerDown;
    private _onPointerUp;
    constructor();
    /**
     * Vincula una acción semántica a una o más teclas crudas o gestos.
     *
     * @param action - Nombre de la acción semántica (e.g., "jump").
     * @param inputs - Array de strings representando entradas crudas (e.g., ["Space", "ArrowUp", "TouchTap"]).
     */
    bind(action: InputAction, inputs: string[]): void;
    /**
     * Vincula un eje a entradas crudas para direcciones positiva y negativa.
     *
     * @param axis - Nombre del eje (e.g., "horizontal").
     * @param pos - Entradas que activan el valor positivo (+1).
     * @param neg - Entradas que activan el valor negativo (-1).
     */
    bindAxis(axis: string, pos: string[], neg: string[]): void;
    /**
     * Sobrescribe programáticamente el estado de una acción semántica.
     * Este override persiste hasta que se cambie explícitamente o se limpie.
     *
     * @remarks
     * Útil para controlar el juego desde componentes de UI de React o para aplicar
     * inputs recibidos a través de la red en modo multijugador.
     *
     * @param action - La acción a sobrescribir.
     * @param isPressed - El nuevo estado de presión.
     */
    setOverride(action: InputAction, isPressed: boolean): void;
    private setupListeners;
    /**
     * Sincroniza el estado de las entradas activas con el componente `InputState` en el mundo.
     *
     * @remarks
     * Combina el estado real del hardware con los overrides programáticos.
     * Si no existe un componente `InputState`, lo crea como un singleton.
     *
     * @param world - El mundo donde reside el componente de entrada.
     * @param _deltaTime - Tiempo transcurrido (en ms).
     *
     * @precondition El `world` debe ser válido.
     * @postcondition El componente singleton {@link InputStateComponent} está actualizado
     * con las acciones activas en el hardware o mediante overrides.
     * @sideEffect Puede crear una nueva entidad si el singleton `InputState` no existe.
     * @mutates world - Crea o actualiza el componente `InputState`.
     */
    update(world: World, _deltaTime: number): void;
    /**
     * Limpia los listeners de eventos globales registrados en `window`.
     *
     * @precondition Debe llamarse cuando el motor se destruye para evitar fugas de memoria.
     */
    cleanup(): void;
    /**
     * Devuelve una instantánea (snapshot) del estado semántico actual de la entrada.
     *
     * @remarks
     * Utilizado principalmente para enviar el estado de entrada a través de la red
     * en juegos multijugador.
     *
     * @returns Un objeto con la lista de acciones activas y el valor de los ejes.
     * @queries activeKeys, activeTouches - Lee el estado de los acumuladores de eventos.
     * @conceptualRisk [INPUT_DRIFT] `getInputState()` actualmente ignora `overrides` y solo considera
     * entradas crudas de hardware. Esto puede causar desincronización si un sistema externo
     * (como un joystick virtual UI) usa `setOverride`.
     */
    getInputState(): {
        actions: string[];
        axes: Record<string, number>;
    };
}

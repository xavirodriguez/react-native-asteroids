import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Componente que define una animación interpolada para una propiedad de un elemento de UI.
 *
 * @responsibility Almacenar el estado y la configuración de una transición visual en la UI.
 */
export interface UITweenComponent {
    type: "UITween";
    /** La propiedad de `UIElementComponent` a animar. */
    property: "opacity" | "offsetX" | "offsetY";
    /** Valor inicial al comienzo del tween. */
    startValue: number;
    /** Valor objetivo al finalizar el tween. */
    endValue: number;
    /** Duración total de la animación en milisegundos. */
    duration: number;
    /** Tiempo transcurrido acumulado. */
    currentTime: number;
    /** Función de curva para la interpolación. */
    easing: "linear" | "easeIn" | "easeOut";
    /** Callback opcional ejecutado al finalizar (si no es un bucle). */
    onComplete?: (world: World, entity: any) => void;
    /** Si es true, reinicia `currentTime` al llegar al final de la duración. */
    loop?: boolean;
}
/**
 * Sistema que procesa las animaciones de UI frame a frame.
 *
 * @responsibility Actualizar las propiedades de `UIElement` basadas en el progreso de sus `UITween`.
 * @queries `UIElement`, `UITween`.
 * @mutates `UIElementComponent`, `UITweenComponent`.
 * @executionOrder Presentation Phase (antes del renderizado, generalmente después del layout si el tween afecta offsets).
 * @conceptualRisk [DT_UNIT_MISMATCH] El sistema asume que `deltaTime` está en la misma unidad que `duration` (ms).
 * Si el motor entrega segundos, la animación será extremadamente lenta o imperceptible.
 */
export declare class UITweenSystem extends System {
    /**
     * Avanza el tiempo de todos los tweens activos y actualiza los componentes de UI asociados.
     *
     * @param world - El mundo ECS.
     * @param deltaTime - El tiempo transcurrido desde el último frame (ms esperados).
     *
     * @sideEffect Modifica `UIElement.opacity/offsetX/offsetY`.
     * @sideEffect Elimina `UITweenComponent` de la entidad al finalizar (si `loop` es false).
     */
    update(world: World, deltaTime: number): void;
    private ease;
}

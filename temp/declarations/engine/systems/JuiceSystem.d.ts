import { Component, Entity } from "../types/EngineTypes";
import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Configuración de una animación individual gestionada por el JuiceSystem.
 */
export interface JuiceAnimation {
    /** Propiedad del Transform o Render que será animada. */
    property: "scaleX" | "scaleY" | "rotation" | "x" | "y" | "opacity";
    /** Valor final deseado tras completar la duración. */
    target: number;
    /** Duración total de la animación en milisegundos. */
    duration: number;
    /** Tiempo transcurrido desde el inicio de la animación en milisegundos. */
    elapsed: number;
    /** Valor capturado al inicio de la animación para interpolación. */
    startValue?: number;
    /** Función de suavizado para la interpolación. Por defecto "linear". */
    easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "elasticOut";
    /** Callback opcional ejecutado al finalizar la animación. */
    onComplete?: (entity: Entity) => void;
}
/**
 * Componente que almacena una cola de animaciones procedimentales (tweens).
 */
export interface JuiceComponent extends Component {
    type: "Juice";
    /** Lista de animaciones activas sobre la entidad. */
    animations: JuiceAnimation[];
}
/**
 * Helper para crear un JuiceComponent inicializado.
 * @returns Instancia de JuiceComponent con lista de animaciones vacía.
 */
export declare function createJuiceComponent(): JuiceComponent;
/**
 * Sistema encargado de procesar animaciones procedimentales (Juice) sobre las entidades.
 * Permite efectos visuales reactivos (pop, squash, stretch, fade) sin lógica de estado compleja.
 *
 * @responsibility Actualizar el progreso de cada {@link JuiceAnimation}.
 * @responsibility Interpolar y aplicar valores a {@link TransformComponent} o {@link RenderComponent}.
 * @responsibility Notificar la finalización mediante callbacks {@link JuiceAnimation.onComplete}.
 *
 * @queries Juice, Transform, Render
 * @mutates Transform.x, Transform.y, Transform.scaleX, Transform.scaleY, Transform.rotation
 * @mutates Render.rotation, Render.opacity
 * @executionOrder Fase: Presentation. Debe ejecutarse después de Simulation para sobreescribir visuales.
 *
 * @remarks
 * El sistema utiliza un integrador basado en tiempo real (ms).
 * Se recomienda para efectos no críticos que no afecten la lógica de colisiones.
 *
 * @conceptualRisk [DETERMINISM][MEDIUM] JuiceSystem muta componentes core (Transform) basándose
 * en animaciones visuales. Si un sistema de simulación lee estos valores para colisiones,
 * podría causar desincronización entre clientes.
 * @conceptualRisk [MUTATION][LOW] Las animaciones se eliminan del array durante la iteración
 * inversa; el diseño es seguro ante mutaciones estructurales locales.
 */
export declare class JuiceSystem extends System {
    update(world: World, deltaTime: number): void;
    private getPropertyValue;
    private setPropertyValue;
    private applyEasing;
    /**
     * Helper estático para añadir una animación a una entidad.
     */
    static add(world: World, entity: Entity, anim: Omit<JuiceAnimation, "elapsed">): void;
}

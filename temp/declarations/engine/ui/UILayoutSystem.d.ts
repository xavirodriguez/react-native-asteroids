import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Sistema que resuelve el posicionamiento y dimensionamiento de elementos de interfaz (UI).
 * Soporta anclajes (anchors), unidades relativas (%), contenedores con flujo y adjuntos al mundo.
 *
 * @responsibility Calcular las coordenadas finales (`computedX`, `computedY`) y dimensiones (`computedWidth`, `computedHeight`) de la UI.
 * @queries `UIElement`, `UIContainer`, `UIWorldAttach`, `Transform`, `Position`, `GameState` (Singleton).
 * @mutates `UIElementComponent`.
 * @dependsOn `UIElementComponent`, `UIContainerComponent`, `UIWorldAttachComponent`.
 * @executionOrder Presentation Phase (antes del renderizado de UI).
 * @conceptualRisk [LAYOUT_CASCADE] Utiliza recursión para resolver el layout. Árboles de UI muy profundos podrían causar stack overflow o problemas de rendimiento.
 * @conceptualRisk [WORLD_SYNC] Los elementos `UIWorldAttach` dependen de la cámara y de componentes `Transform`/`Position`. Si estos se actualizan después del layout, la UI "vibrará" o irá con retraso (lag) respecto a la entidad.
 */
export declare class UILayoutSystem extends System {
    private viewportWidth;
    private viewportHeight;
    /**
     * Inicializa el sistema de layout con dimensiones de pantalla iniciales.
     *
     * @param viewportWidth - Ancho de la zona de renderizado (default 800).
     * @param viewportHeight - Alto de la zona de renderizado (default 600).
     */
    constructor(viewportWidth?: number, viewportHeight?: number);
    /**
     * Actualiza las dimensiones de referencia para los cálculos de layout.
     *
     * @param width - Nuevo ancho.
     * @param height - Nuevo alto.
     */
    setViewportSize(width: number, height: number): void;
    /**
     * Ejecuta la resolución de layout para todas las entidades con `UIElement`.
     *
     * @param world - El mundo ECS.
     * @param deltaTime - Tiempo del frame (ignorado por este sistema ya que es puramente posicional).
     *
     * @sideEffect Actualiza las propiedades `computed*` de los componentes `UIElement`.
     */
    update(world: World, deltaTime: number): void;
    /**
     * Resuelve de forma recursiva la posición y tamaño de un elemento y sus hijos.
     *
     * @param world - El mundo ECS.
     * @param entity - La entidad UI a procesar.
     * @param childrenByParent - Mapa de relaciones jerárquicas pre-calculado.
     *
     * @conceptualRisk [ZALGO_MAPPING] Si `childrenByParent` no incluye a todos los miembros de `uiEntities` de `update()`, algunos elementos quedarán huérfanos.
     */
    private layoutElement;
    private layoutContainerChildren;
    private alignInAxis;
    private resolveValue;
    private resolveAnchorPosition;
    /**
     * Proyecta un elemento de UI en coordenadas de pantalla basándose en una entidad del mundo.
     *
     * @param world - El mundo ECS.
     * @param element - El componente UI a posicionar.
     * @param attach - Definición del anclaje al mundo.
     *
     * @remarks
     * Intenta leer `worldX/worldY` de `Transform` primero, cayendo a `x/y` si no existen.
     *
     * @conceptualRisk [TYPE_UNSAFETY] Usa `any` para acceder a `Transform`, `Position` y `GameState`.
     * Esto oculta posibles errores si la estructura de estos componentes cambia.
     */
    private resolveWorldPosition;
}

import { World } from "../core/World";
import { SceneGraph } from "../core/SceneGraph";
import { Renderer } from "./RenderTypes";
/**
 * Sistema puente entre el mundo ECS y los backends de renderizado.
 *
 * @remarks
 * RenderSystem es responsable de traducir los componentes `Renderable` en comandos de dibujo
 * genéricos que cualquier implementación de `Renderer` (Canvas, Skia, SVG) pueda procesar.
 * Gestiona el orden de dibujado (Z-order) y la visibilidad.
 *
 * @responsibility Consultar entidades renderizables y generar la lista de comandos.
 * @responsibility Aplicar transformaciones de mundo obtenidas del `SceneGraph`.
 * @responsibility Orquestar el ciclo de vida del frame en el renderer (begin/submit/end).
 *
 * @queries Renderable, Transform
 * @mutates Renderer (indirecto vía comandos), CommandPool
 * @dependsOn SceneGraph, Renderer, World
 * @executionOrder Fase: Presentation. Ejecutar después de la simulación y antes del fin del frame.
 *
 * @conceptualRisk [Z_ORDER_STABILITY][LOW] El algoritmo de ordenación utilizado (Array.sort)
 * puede no ser estable en todos los motores JS, lo que podría causar parpadeo visual
 * si dos entidades comparten el mismo `zOrder`.
 * @conceptualRisk [SCENE_GRAPH_DEPENDENCY][MEDIUM] Si el `SceneGraph` no se actualiza
 * antes que el `RenderSystem`, se renderizarán posiciones de frames anteriores.
 */
export declare class RenderSystem {
    private renderer;
    private sceneGraph;
    private commandPool;
    private activeCommands;
    private poolIndex;
    constructor(renderer: Renderer, sceneGraph: SceneGraph);
    /**
     * Genera y despacha comandos de renderizado para el frame actual.
     *
     * @remarks
     * Utiliza un pool interno de comandos para evitar asignaciones de memoria en cada frame.
     * Las transformaciones se extraen del `SceneGraph` para soportar jerarquías.
     *
     * @param world - El mundo ECS de donde extraer los componentes `Renderable`.
     * @param alpha - Factor de interpolación para la suavización visual.
     *
     * @precondition El `SceneGraph` debe haber resuelto las transformaciones de mundo antes de esta llamada.
     * @postcondition El `renderer` asociado recibe una secuencia ordenada de comandos.
     * @sideEffect Llama a `renderer.beginFrame`, `renderer.submit` y `renderer.endFrame`.
     */
    update(world: World, alpha: number): void;
    private copyTransform;
    private acquireCommand;
}

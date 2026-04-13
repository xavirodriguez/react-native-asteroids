import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderSnapshot } from "./RenderSnapshot";
export type ShapeDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, world: World, render: any) => void;
/**
 * 2D Canvas-based Rendering Engine.
 *
 * @remarks
 * Implements a snapshot-based architecture for decoupled and consistent rendering.
 * Allocation-free in the hot loop using pooled commands and double-buffered snapshots.
 */
export declare class CanvasRenderer implements Renderer {
    readonly type = "canvas";
    protected ctx: CanvasRenderingContext2D | null;
    protected width: number;
    protected height: number;
    private shapeDrawers;
    private postEntityDrawers;
    private preRenderHooks;
    private postRenderHooks;
    private backgroundEffects;
    private foregroundEffects;
    private commandBuffer;
    private readonly MAX_ENTITIES;
    private readonly snapshotA;
    private readonly snapshotB;
    private currentSnapshot;
    constructor(ctx?: CanvasRenderingContext2D);
    private createEmptySnapshot;
    private swapSnapshots;
    registerShape(name: string, drawer: ShapeDrawer): void;
    registerShapeDrawer(name: string, drawer: ShapeDrawer): void;
    registerPostEntityDrawer(name: string, drawer: ShapeDrawer): void;
    addPreRenderHook(hook: (ctx: CanvasRenderingContext2D, world: World) => void): void;
    addPostRenderHook(hook: (ctx: CanvasRenderingContext2D, world: World) => void): void;
    registerBackgroundEffect(name: string, drawer: any): void;
    registerForegroundEffect(name: string, drawer: any): void;
    private registerDefaultDrawers;
    setContext(ctx: CanvasRenderingContext2D): void;
    setSize(width: number, height: number): void;
    clear(): void;
    /**
     * Captura una instantánea visual del estado actual del mundo ECS.
     *
     * @remarks
     * Realiza la interpolación lineal de las transformaciones basándose en el valor `alpha`
     * para suavizar el movimiento entre ticks de simulación fijos.
     * Procesa el Screen Shake si el componente `GameState` lo indica.
     *
     * @param world - El mundo ECS a capturar.
     * @param alpha - Factor de interpolación entre 0 (frame anterior) y 1 (frame actual).
     * @returns Una referencia al objeto {@link RenderSnapshot} interno (reutilizado).
     *
     * @precondition Las entidades deben poseer componentes `Transform` y `Render`.
     * @postcondition El objeto `RenderSnapshot` devuelto es una referencia al buffer interno
     * para evitar asignaciones de memoria.
     * @sideEffect Lee la semilla de `RandomService("render")` para el cálculo del Screen Shake.
     */
    createSnapshot(world: World, alpha: number): RenderSnapshot;
    /**
     * Realiza el dibujado efectivo en el Canvas a partir de un snapshot.
     *
     * @remarks
     * Sigue un pipeline estricto: Clear -> Background -> Pre-Hooks -> Entities (Sorted) ->
     * Foreground -> Post-Hooks -> UI.
     *
     * @param snapshot - Los datos visuales capturados previamente.
     * @param world - El mundo ECS (necesario para hooks y drawers personalizados).
     *
     * @precondition El contexto 2D del Canvas debe estar inicializado.
     * @postcondition El Canvas refleja el estado visual del snapshot.
     * @sideEffect Limpia el Canvas con el color de fondo por defecto (negro).
     * @sideEffect Ejecuta todos los hooks y efectos registrados.
     */
    renderSnapshot(snapshot: RenderSnapshot, world: World): void;
    private executeCommand;
    render(world: World, alpha?: number): void;
}

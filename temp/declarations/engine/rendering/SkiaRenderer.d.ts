import { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, Component } from "../core/CoreComponents";
export type SkiaShapeDrawer = (canvas: SkCanvas, entity: Entity, world: World, render: RenderComponent, paint: SkPaint) => void;
/**
 * Implementación de Renderer basada en la API de Skia para React Native.
 * Proporciona renderizado acelerado por hardware óptimo para dispositivos móviles.
 *
 * @responsibility Dibujar el estado del mundo ECS utilizando el backend nativo de Skia.
 * @responsibility Gestionar la interpolación visual entre ticks físicos.
 * @queries Transform, Render, GameState
 * @executionOrder Fase: Renderizado (Sincronizado con VSync).
 *
 * @remarks
 * Al igual que el {@link CanvasRenderer}, es extensible mediante el registro de shape drawers.
 * Es el renderizador preferido para iOS y Android por su rendimiento superior.
 * Contrato de consistencia: Debe mantener paridad visual con {@link CanvasRenderer}.
 *
 * @contract Interpolación: Usa el valor `alpha` del loop para interpolar entre `PreviousTransform` y `Transform`.
 * @conceptualRisk [SKIA_CONTEXT_LOST][MEDIUM] En dispositivos móviles, el contexto de Skia puede perderse
 * si la app pasa a segundo plano de forma prolongada.
 */
export declare class SkiaRenderer implements Renderer {
    readonly type = "skia";
    protected canvas: SkCanvas | null;
    protected width: number;
    protected height: number;
    protected paint: SkPaint;
    private shapeDrawers;
    private postEntityDrawers;
    private preRenderHooks;
    private postRenderHooks;
    constructor(canvas?: any);
    registerShapeDrawer(shape: string, drawer: SkiaShapeDrawer): void;
    registerPostEntityDrawer(shape: string, drawer: SkiaShapeDrawer): void;
    addPreRenderHook(hook: (canvas: SkCanvas, world: World) => void): void;
    addPostRenderHook(hook: (canvas: SkCanvas, world: World) => void): void;
    private registerDefaultDrawers;
    setCanvas(canvas: SkCanvas): void;
    setSize(width: number, height: number): void;
    clear(): void;
    private alpha;
    setAlpha(alpha: number): void;
    /**
     * Ejecuta el pipeline de renderizado de Skia.
     *
     * @param world - El mundo ECS que contiene las entidades a dibujar.
     *
     * @precondition El lienzo (SkCanvas) debe estar listo para recibir comandos.
     * @postcondition Se genera la imagen del frame actual con interpolación aplicada.
     * @invariant No debe mutar componentes de simulación (Transform, Velocity).
     * @sideEffect Limpia el lienzo con el color negro.
     * @conceptualRisk [SKIA_CONTEXT_LOST][MEDIUM] En dispositivos móviles, el contexto de Skia
     * puede perderse si la app pasa a segundo plano de forma prolongada.
     */
    render(world: World): void;
    drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;
    registerShape(name: string, drawer: any): void;
    registerBackgroundEffect(name: string, drawer: any): void;
    registerForegroundEffect(name: string, drawer: any): void;
    drawParticles(world: World): void;
}

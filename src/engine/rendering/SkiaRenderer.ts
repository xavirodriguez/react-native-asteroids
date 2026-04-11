import { Skia, SkCanvas, SkPaint, PaintStyle } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TTLComponent, TransformComponent, PreviousTransformComponent, Component } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";

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
 */
export class SkiaRenderer implements Renderer {
  public readonly type = 'skia';
  protected canvas: SkCanvas | null = null;
  protected width: number = 0;
  protected height: number = 0;
  protected paint: SkPaint;
  private shapeDrawers = new Map<string, SkiaShapeDrawer>();
  private postEntityDrawers = new Map<string, SkiaShapeDrawer>();
  private preRenderHooks: ((canvas: SkCanvas, world: World) => void)[] = [];
  private postRenderHooks: ((canvas: SkCanvas, world: World) => void)[] = [];

  constructor(canvas?: any) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.paint = Skia.Paint();
    this.registerDefaultDrawers();
  }

  public registerShapeDrawer(shape: string, drawer: SkiaShapeDrawer): void {
    this.shapeDrawers.set(shape, drawer);
  }

  public registerPostEntityDrawer(shape: string, drawer: SkiaShapeDrawer): void {
    this.postEntityDrawers.set(shape, drawer);
  }

  public addPreRenderHook(hook: (canvas: SkCanvas, world: World) => void): void {
    this.preRenderHooks.push(hook);
  }

  public addPostRenderHook(hook: (canvas: SkCanvas, world: World) => void): void {
    this.postRenderHooks.push(hook);
  }

  private registerDefaultDrawers(): void {
    this.registerShapeDrawer("circle", (canvas, _, __, render, paint) => {
      const color = Skia.Color(render.color);
      color[3] *= paint.getAlphaf();
      paint.setColor(color);
      paint.setStyle(PaintStyle.Fill);
      canvas.drawCircle(0, 0, render.size, paint);
    });

    this.registerShapeDrawer("rect", (canvas, _, __, render, paint) => {
      const color = Skia.Color(render.color);
      color[3] *= paint.getAlphaf();
      paint.setColor(color);
      paint.setStyle(PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-render.size / 2, -render.size / 2, render.size, render.size), paint);
    });

    this.registerShapeDrawer("polygon", (canvas, _, __, render, paint) => {
      if (!render.vertices || render.vertices.length === 0) return;

      const path = Skia.Path.Make();
      path.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
          path.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      path.close();

      const isHitFlash = render.data?.hitFlashFrames && render.data.hitFlashFrames > 0;
      const fillColor = Skia.Color(isHitFlash ? "rgba(255, 255, 255, 0.5)" : "#333");
      fillColor[3] *= paint.getAlphaf();
      paint.setColor(fillColor);
      paint.setStyle(PaintStyle.Fill);
      canvas.drawPath(path, paint);

      const strokeColor = Skia.Color(isHitFlash ? "white" : render.color);
      strokeColor[3] *= paint.getAlphaf();
      paint.setColor(strokeColor);
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      canvas.drawPath(path, paint);

      if (render.data?.internalLines) {
          const lineColor = Skia.Color("#222");
          lineColor[3] *= paint.getAlphaf();
          paint.setColor(lineColor);
          paint.setStrokeWidth(1);
          render.data.internalLines.forEach((line: any) => {
              canvas.drawLine(line.x1, line.y1, line.x2, line.y2, paint);
          });
      }
    });

    this.registerShapeDrawer("line", (canvas, _, __, render, paint) => {
      const color = Skia.Color(render.color);
      color[3] *= paint.getAlphaf();
      paint.setColor(color);
      paint.setStrokeWidth(2);
      canvas.drawLine(-render.size / 2, 0, render.size / 2, 0, paint);
    });
  }

  public setCanvas(canvas: SkCanvas): void {
    this.canvas = canvas;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public clear(): void {
    if (!this.canvas) return;
    this.canvas.clear(Skia.Color("black"));
  }

  private alpha: number = 1;

  public setAlpha(alpha: number): void {
    this.alpha = alpha;
  }

  /**
   * Ejecuta el pipeline de renderizado de Skia.
   *
   * @param world - El mundo ECS que contiene las entidades a dibujar.
   *
   * @invariant No debe mutar componentes de simulación (Transform, Velocity).
   * @conceptualRisk [SKIA_CONTEXT_LOST] En dispositivos móviles, el contexto de Skia puede perderse
   * si la app pasa a segundo plano de forma prolongada.
   */
  public render(world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    this.clear();

    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity
      ? (world.getComponent<any>(gameStateEntity, "GameState"))
      : null;

    let shakeX = 0;
    let shakeY = 0;
    if (gameState?.screenShake && gameState.screenShake.framesLeft > 0) {
      const renderRandom = RandomService.getInstance("render");
      shakeX = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
      shakeY = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
    }

    canvas.save();
    canvas.translate(shakeX, shakeY);

    this.preRenderHooks.forEach(hook => hook(canvas, world));

    const entities = world.query("Transform", "Render");

    const renderCommands = entities.map(entity => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const prevPos = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      // Interpolate position and rotation
      const interpolatedPos = { ...pos };
      if (prevPos && this.alpha < 1) {
        interpolatedPos.x = prevPos.x + (pos.x - prevPos.x) * this.alpha;
        interpolatedPos.y = prevPos.y + (pos.y - prevPos.y) * this.alpha;

        // Shortest path rotation interpolation
        let diff = pos.rotation - prevPos.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        interpolatedPos.rotation = prevPos.rotation + diff * this.alpha;
      }

      return {
        entity,
        pos: interpolatedPos,
        render,
        zIndex: (render as any).zIndex ?? 0
      };
    });

    renderCommands.sort((a, b) => a.zIndex - b.zIndex);

    renderCommands.forEach((cmd) => {
      this.drawEntity(cmd.entity, { Transform: cmd.pos, Render: cmd.render }, world);
    });

    this.drawParticles(world);

    canvas.restore();

    this.postRenderHooks.forEach(hook => hook(canvas, world));
  }

  public drawEntity(entity: Entity, components: Record<string, Component>, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;
    const pos = components["Transform"] as TransformComponent;
    const render = components["Render"] as RenderComponent;

    if (!pos || !render) return;

    const x = pos.worldX !== undefined ? pos.worldX : pos.x;
    const y = pos.worldY !== undefined ? pos.worldY : pos.y;
    const rotation = pos.worldRotation !== undefined ? pos.worldRotation : render.rotation;
    const scaleX = pos.worldScaleX !== undefined ? pos.worldScaleX : (pos.scaleX ?? 1);
    const scaleY = pos.worldScaleY !== undefined ? pos.worldScaleY : (pos.scaleY ?? 1);

    canvas.save();
    canvas.translate(x, y);
    canvas.rotate((rotation * 180) / Math.PI, 0, 0);
    canvas.scale(scaleX, scaleY);

    const opacity = (render as any).opacity !== undefined ? (render as any).opacity : 1;
    this.paint.setAlphaf(opacity);

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
        drawer(canvas, entity, world, render, this.paint);
    }

    canvas.restore();

    const postDrawer = this.postEntityDrawers.get(render.shape);
    if (postDrawer) {
        postDrawer(canvas, entity, world, render, this.paint);
    }
  }

  public registerShape(name: string, drawer: any): void {
    this.shapeDrawers.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: any): void {
      // Basic implementation to satisfy Renderer interface
  }

  public registerForegroundEffect(name: string, drawer: any): void {
      // Basic implementation to satisfy Renderer interface
  }

  public drawParticles(world: World): void {
    // Basic implementation for now to satisfy call in render()
  }
}

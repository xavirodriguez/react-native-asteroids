import { Skia, SkCanvas, SkPaint, PaintStyle } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity } from "../core/Entity";
import {
  Component,
  TransformComponent,
  RenderComponent,
  GenericComponent
} from "../core/CoreComponents";
import { RenderSnapshot } from "./RenderSnapshot";
import { RenderCommandBuffer, DrawCommand } from "./RenderCommandBuffer";
import { RenderSnapshotProvider } from "./RenderSnapshotProvider";

/**
 * Implementación de Renderer basada en la API de Skia para React Native.
 * Proporciona renderizado acelerado por hardware en dispositivos compatibles.
 *
 * @responsibility Dibujar el estado del mundo ECS utilizando el backend nativo de Skia.
 * @responsibility Gestionar la interpolación visual entre ticks físicos.
 * @queries Transform, Render, GameState
 * @executionOrder Fase: Renderizado (Sincronizado con VSync).
 *
 * @remarks
 * Al igual que el {@link CanvasRenderer}, es extensible mediante el registro de shape drawers.
 * Es el renderizador preferido para iOS y Android por su rendimiento en plataformas móviles.
 * La paridad visual con {@link CanvasRenderer} es un objetivo de diseño importante.
 *
 * @remarks
 * Interpolación: Intenta usar el valor `alpha` del loop para interpolar entre `PreviousTransform` y `Transform`.
 * @conceptualRisk [SKIA_CONTEXT_LOST][MEDIUM] En dispositivos móviles, el contexto de Skia puede perderse
 * si la app pasa a segundo plano de forma prolongada.
 *
 * ### Patrones de Optimización:
 * 1. **Factory Pattern para SkPaint**: Utiliza objetos `SkPaint` reutilizables para evitar
 *    alocaciones costosas en el hot-path de renderizado.
 * 2. **Hardware Acceleration**: Aprovecha la GPU del dispositivo para operaciones complejas
 *    de dibujo y efectos de mezcla.
 */
export class SkiaRenderer implements Renderer {
  public readonly type = 'skia';
  protected canvas: SkCanvas | null = null;
  protected width: number = 0;
  protected height: number = 0;
  protected paint: SkPaint;
  private shapeDrawers = new Map<string, ShapeDrawer<SkCanvas>>();
  private postEntityDrawers = new Map<string, ShapeDrawer<SkCanvas>>();
  private preRenderHooks: ((canvas: SkCanvas, world: World) => void)[] = [];
  private postRenderHooks: ((canvas: SkCanvas, world: World) => void)[] = [];
  private backgroundEffects: { name: string, drawer: EffectDrawer<SkCanvas> }[] = [];
  private foregroundEffects: { name: string, drawer: EffectDrawer<SkCanvas> }[] = [];

  private commandBuffer = new RenderCommandBuffer();
  private readonly MAX_ENTITIES = 2000;
  private readonly snapshotA: RenderSnapshot;
  private readonly snapshotB: RenderSnapshot;
  private currentSnapshot: RenderSnapshot;

  // Reusable objects for drawing
  private readonly tempPos = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  private readonly tempRender: { shape: string, size: number, color: string, vertices?: ReadonlyArray<{readonly x: number, readonly y: number}> | null, hitFlashFrames: number, data: Record<string, unknown> | null } =
    { shape: "", size: 0, color: "", hitFlashFrames: 0, data: null };

  constructor(canvas?: SkCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.paint = Skia.Paint();

    this.snapshotA = this.createEmptySnapshot();
    this.snapshotB = this.createEmptySnapshot();
    this.currentSnapshot = this.snapshotA;

    this.registerDefaultDrawers();
  }

  private createEmptySnapshot(): RenderSnapshot {
    const entities = new Array(this.MAX_ENTITIES);
    for (let i = 0; i < this.MAX_ENTITIES; i++) {
      entities[i] = {
        id: 0, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
        opacity: 1, zIndex: 0, shape: "", color: "", size: 0,
        vertices: null, hitFlashFrames: 0, data: null
      };
    }
    return {
      entities,
      entityCount: 0,
      uiElements: [],
      uiCount: 0,
      shakeX: 0,
      shakeY: 0,
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
      elapsedTime: 0
    };
  }

  private swapSnapshots(): void {
    this.currentSnapshot = this.currentSnapshot === this.snapshotA ? this.snapshotB : this.snapshotA;
  }

  public registerShapeDrawer(shape: string, drawer: ShapeDrawer<SkCanvas>): void {
    this.shapeDrawers.set(shape, drawer);
  }

  public registerPostEntityDrawer(shape: string, drawer: ShapeDrawer<SkCanvas>): void {
    this.postEntityDrawers.set(shape, drawer);
  }

  public addPreRenderHook(hook: (canvas: SkCanvas, world: World) => void): void {
    this.preRenderHooks.push(hook);
  }

  public addPostRenderHook(hook: (canvas: SkCanvas, world: World) => void): void {
    this.postRenderHooks.push(hook);
  }

  private registerDefaultDrawers(): void {
    this.registerShapeDrawer("circle", (canvas, _entity, _pos, _elapsedTime, render) => {
      const color = Skia.Color(render.color);
      color[3] *= this.paint.getAlphaf();
      this.paint.setColor(color);
      this.paint.setStyle(PaintStyle.Fill);
      canvas.drawCircle(0, 0, render.size, this.paint);
    });

    this.registerShapeDrawer("rect", (canvas, _entity, _pos, _elapsedTime, render) => {
      const color = Skia.Color(render.color);
      color[3] *= this.paint.getAlphaf();
      this.paint.setColor(color);
      this.paint.setStyle(PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-render.size / 2, -render.size / 2, render.size, render.size), this.paint);
    });

    this.registerShapeDrawer("polygon", (canvas, _entity, _pos, _elapsedTime, render) => {
      if (!render.vertices || render.vertices.length === 0) return;

      const path = Skia.Path.Make();
      path.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
          path.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      path.close();

      const isHitFlash = (render.hitFlashFrames ?? 0) > 0;
      const fillColor = Skia.Color(isHitFlash ? "rgba(255, 255, 255, 0.5)" : "#333");
      fillColor[3] *= this.paint.getAlphaf();
      this.paint.setColor(fillColor);
      this.paint.setStyle(PaintStyle.Fill);
      canvas.drawPath(path, this.paint);

      const strokeColor = Skia.Color(isHitFlash ? "white" : render.color);
      strokeColor[3] *= this.paint.getAlphaf();
      this.paint.setColor(strokeColor);
      this.paint.setStyle(PaintStyle.Stroke);
      this.paint.setStrokeWidth(2);
      canvas.drawPath(path, this.paint);

      if (render.data?.internalLines) {
          const lineColor = Skia.Color("#222");
          lineColor[3] *= this.paint.getAlphaf();
          this.paint.setColor(lineColor);
          this.paint.setStrokeWidth(1);
          const internalLines = render.data.internalLines as ReadonlyArray<{ readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }>;
          internalLines.forEach((line) => {
              canvas.drawLine(line.x1, line.y1, line.x2, line.y2, this.paint);
          });
      }
    });

    this.registerShapeDrawer("line", (canvas, _entity, _pos, _elapsedTime, render) => {
      const color = Skia.Color(render.color);
      color[3] *= this.paint.getAlphaf();
      this.paint.setColor(color);
      this.paint.setStrokeWidth(2);
      canvas.drawLine(-render.size / 2, 0, render.size / 2, 0, this.paint);
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

  public createSnapshot(world: World, alpha: number = 1): RenderSnapshot {
    this.swapSnapshots();
    return RenderSnapshotProvider.createSnapshot(world, alpha, this.width, this.height, this.currentSnapshot);
  }

  public render(world: World, alpha: number = 1): void {
    if (!this.canvas) return;
    const snapshot = this.createSnapshot(world, alpha);
    this.renderSnapshot(snapshot, world);
  }

  public renderSnapshot(snapshot: RenderSnapshot, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    this.commandBuffer.clear();

    for (let i = 0; i < snapshot.entityCount; i++) {
      const ent = snapshot.entities[i];
      this.commandBuffer.addCommand({
        type: ent.shape,
        x: ent.x,
        y: ent.y,
        rotation: ent.rotation,
        scaleX: ent.scaleX,
        scaleY: ent.scaleY,
        opacity: ent.opacity,
        color: ent.color,
        size: ent.size,
        zIndex: ent.zIndex,
        entityId: ent.id,
        vertices: ent.vertices,
        hitFlashFrames: ent.hitFlashFrames,
        data: ent.data
      });
    }

    this.commandBuffer.sort();

    this.clear();

    // 1. Background effects and pre-render hooks (Screen Space)
    canvas.save();
    this.preRenderHooks.forEach(hook => hook(canvas, world));
    this.backgroundEffects.forEach(effect => {
      effect.drawer(canvas, snapshot, this.width, this.height, world);
    });
    canvas.restore();

    // 2. World Space Rendering (Entities)
    canvas.save();
    canvas.translate(snapshot.shakeX, snapshot.shakeY);
    canvas.scale(snapshot.cameraZoom, snapshot.cameraZoom);
    canvas.translate(-snapshot.cameraX, -snapshot.cameraY);

    const commands = this.commandBuffer.getCommands();
    const cmdCount = this.commandBuffer.getCount();
    for (let i = 0; i < cmdCount; i++) {
        this.executeCommand(canvas, commands[i], world, snapshot.elapsedTime);
    }

    this.drawParticles(world);
    canvas.restore();

    // 3. Foreground effects (Screen Space)
    canvas.save();
    this.foregroundEffects.forEach(effect => {
      effect.drawer(canvas, snapshot, this.width, this.height, world);
    });
    canvas.restore();

    // 4. Post-render hooks
    this.postRenderHooks.forEach(hook => hook(canvas, world));
  }

  private executeCommand(canvas: SkCanvas, cmd: DrawCommand, world: World, elapsedTime: number): void {
    canvas.save();
    canvas.translate(cmd.x, cmd.y);
    canvas.rotate((cmd.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(cmd.scaleX, cmd.scaleY);

    this.paint.setAlphaf(cmd.opacity);

    this.tempPos.x = cmd.x;
    this.tempPos.y = cmd.y;
    this.tempPos.rotation = cmd.rotation;
    this.tempPos.scaleX = cmd.scaleX;
    this.tempPos.scaleY = cmd.scaleY;

    this.tempRender.shape = cmd.type;
    this.tempRender.size = cmd.size;
    this.tempRender.color = cmd.color;
    this.tempRender.vertices = cmd.vertices || undefined;
    this.tempRender.hitFlashFrames = cmd.hitFlashFrames;
    this.tempRender.data = cmd.data;

    const drawer = this.shapeDrawers.get(cmd.type);
    if (drawer) {
      drawer(canvas, cmd.entityId, this.tempPos, elapsedTime, this.tempRender, world);
    }

    canvas.restore();

    const postDrawer = this.postEntityDrawers.get(cmd.type);
    if (postDrawer) {
      postDrawer(canvas, cmd.entityId, this.tempPos, elapsedTime, this.tempRender, world);
    }
  }

  public drawEntity(entity: Entity, components: Record<string, Component>, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;
    const pos = components["Transform"] as TransformComponent;
    const render = components["Render"] as RenderComponent;
    const offset = components["VisualOffset"] as unknown as import("../core/CoreComponents").VisualOffsetComponent;

    if (!pos || !render) return;

    // Note: If using interpolatedPos from render(), worldX/Y might already be the interpolated world values.
    // However, drawEntity is also used for particles or other direct calls.
    const x = (pos.worldX !== undefined ? pos.worldX : pos.x) + (offset?.x ?? 0);
    const y = (pos.worldY !== undefined ? pos.worldY : pos.y) + (offset?.y ?? 0);
    const rotation = (pos.worldRotation !== undefined ? pos.worldRotation : (pos.rotation ?? 0)) + (offset?.rotation ?? 0);
    const scaleX = (pos.worldScaleX !== undefined ? pos.worldScaleX : (pos.scaleX ?? 1)) + (offset?.scaleX ?? 0);
    const scaleY = (pos.worldScaleY !== undefined ? pos.worldScaleY : (pos.scaleY ?? 1)) + (offset?.scaleY ?? 0);

    // Busca calcular un tiempo transcurrido consistente a partir del estado del mundo
    const gameState = world.getSingleton<GenericComponent<{ serverTick?: number }>>("GameState");
    const serverTick = gameState && gameState.serverTick !== undefined ? gameState.serverTick : null;
    const elapsedTime = serverTick !== null ? serverTick * (1000 / 60) : performance.now();

    canvas.save();
    canvas.translate(x, y);
    canvas.rotate((rotation * 180) / Math.PI, 0, 0);
    canvas.scale(scaleX, scaleY);

    const opacity = render.data?.opacity !== undefined ? (render.data.opacity as number) : 1;
    this.paint.setAlphaf(opacity);

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
      drawer(canvas, entity, { x, y, rotation, scaleX, scaleY }, elapsedTime, {
        shape: render.shape,
        size: render.size,
        color: render.color,
        vertices: render.vertices ?? null,
        hitFlashFrames: render.hitFlashFrames ?? 0,
        data: render.data ?? null
      }, world);
    }

    canvas.restore();

    const postDrawer = this.postEntityDrawers.get(render.shape);
    if (postDrawer) {
      postDrawer(canvas, entity, { x, y, rotation, scaleX, scaleY }, elapsedTime, {
        shape: render.shape,
        size: render.size,
        color: render.color,
        vertices: render.vertices ?? null,
        hitFlashFrames: render.hitFlashFrames ?? 0,
        data: render.data ?? null
      }, world);
    }
  }

  public registerShape(_name: string, _drawer: ShapeDrawer<SkCanvas>): void {
    this.shapeDrawers.set(_name, _drawer);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<SkCanvas>): void {
      this.backgroundEffects.push({ name, drawer });
  }

  public registerForegroundEffect(name: string, drawer: EffectDrawer<SkCanvas>): void {
      this.foregroundEffects.push({ name, drawer });
  }

  public drawParticles( _world: World): void {
    // Basic implementation for now to satisfy call in render()
  }
}

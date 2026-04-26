import { Skia, SkCanvas, SkPaint, PaintStyle } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TransformComponent, PreviousTransformComponent, Component, GenericComponent } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";

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

  constructor(canvas?: SkCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.paint = Skia.Paint();
    this.registerDefaultDrawers();
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
          const internalLines = render.data.internalLines as Array<{ x1: number; y1: number; x2: number; y2: number }>;
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

  /**
   * Genera una instantánea ligera del estado visual para efectos y UI.
   */
  public createSnapshot(world: World): import("./RenderSnapshot").RenderSnapshot {
    const cameras = world.query("Camera2D");
    let mainCam: import("../core/CoreComponents").Camera2DComponent | null = null;
    for (const camEntity of cameras) {
      const cam = world.getComponent<import("../core/CoreComponents").Camera2DComponent>(camEntity, "Camera2D")!;
      if (cam.isMain || !mainCam) {
        mainCam = cam;
        if (cam.isMain) break;
      }
    }

    let shakeX = 0;
    let shakeY = 0;

    // Aggregate Screen Shake from all entities with ScreenShakeComponent
    const shakeEntities = world.query("ScreenShake");
    const renderRandom = RandomService.getInstance("render");

    for (let i = 0; i < shakeEntities.length; i++) {
        const shake = world.getComponent<import("../core/CoreComponents").ScreenShakeComponent>(shakeEntities[i], "ScreenShake");
        if (shake && (shake.remaining > 0 || shake.duration > 0)) {
            shakeX += (renderRandom.next() - 0.5) * shake.intensity;
            shakeY += (renderRandom.next() - 0.5) * shake.intensity;
        }
    }

    // Support legacy ScreenShake in GameState for backward compatibility
    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity ? world.getComponent<GenericComponent>(gameStateEntity, "GameState") : null;

    if (gameState?.screenShake) {
      const screenShake = gameState.screenShake as Record<string, number>;
      if (screenShake.remaining > 0 || screenShake.duration > 0) {
        shakeX += (renderRandom.next() - 0.5) * screenShake.intensity;
        shakeY += (renderRandom.next() - 0.5) * screenShake.intensity;
      }
    }

    if (mainCam && (mainCam.shakeOffsetX !== 0 || mainCam.shakeOffsetY !== 0)) {
        shakeX += mainCam.shakeOffsetX;
        shakeY += mainCam.shakeOffsetY;
    }

    const serverTick = gameState && (gameState as Record<string, unknown>).serverTick !== undefined ? (gameState as Record<string, unknown>).serverTick as number : null;
    const elapsedTime = serverTick !== null ? serverTick * (1000 / 60) : performance.now();

    return {
      entities: [],
      entityCount: 0,
      uiElements: [],
      uiCount: 0,
      shakeX,
      shakeY,
      cameraX: mainCam?.x ?? 0,
      cameraY: mainCam?.y ?? 0,
      cameraZoom: mainCam?.zoom ?? 1,
      elapsedTime
    };
  }

  /**
   * Ejecuta el pipeline de renderizado de Skia.
   *
   * @remarks
   * A diferencia del {@link CanvasRenderer}, esta implementación realiza actualmente un dibujo
   * directo desde el World, manteniendo soporte para la interpolación visual mediante el factor `alpha`.
   * Se recomienda evolucionar hacia el modelo de snapshots para favorecer la consistencia visual total.
   *
   * @param world - El mundo ECS que contiene las entidades a dibujar.
   * @param alpha - Factor de interpolación [0, 1].
   *
   * @precondition El lienzo (SkCanvas) debería estar listo para recibir comandos.
   * @postcondition Se genera la imagen del frame actual con el fin de aplicar interpolación.
   * @warning Se recomienda no mutar componentes de simulación (e.g. Transform, Velocity) durante el renderizado.
   * @sideEffect Limpia el lienzo con el color negro antes de dibujar.
   * @conceptualRisk [SKIA_CONTEXT_LOST][MEDIUM] En dispositivos móviles, el contexto de Skia
   * puede perderse si la app pasa a segundo plano de forma prolongada.
   */
  public render(world: World, alpha: number = 1): void {
    if (!this.canvas) return;
    const canvas = this.canvas;
    this.alpha = alpha;

    this.clear();

    const snapshot = this.createSnapshot(world);

    // 1. Background effects and pre-render hooks (Screen Space)
    canvas.save();
    this.preRenderHooks.forEach(hook => hook(canvas, world));
    this.backgroundEffects.forEach(effect => {
      effect.drawer(canvas, snapshot, this.width, this.height, world);
    });
    canvas.restore();

    // 2. World Space Rendering (Entities)
    canvas.save();
    // Apply Camera Transformation (Shake -> Zoom -> Translate)
    canvas.translate(snapshot.shakeX, snapshot.shakeY);
    canvas.scale(snapshot.cameraZoom, snapshot.cameraZoom);
    canvas.translate(-snapshot.cameraX, -snapshot.cameraY);

    const entities = world.query("Transform", "Render");

    const renderCommands = entities.map(entity => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const prevPos = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      // Interpolate position and rotation
      const interpolatedPos = { ...pos };
      if (prevPos && this.alpha < 1) {
        // Prefer world coordinates if available for consistent hierarchy interpolation
        const prevX = prevPos.worldX !== undefined ? prevPos.worldX : prevPos.x;
        const prevY = prevPos.worldY !== undefined ? prevPos.worldY : prevPos.y;
        const prevRot = prevPos.worldRotation !== undefined ? prevPos.worldRotation : prevPos.rotation;

        const currentX = pos.worldX !== undefined ? pos.worldX : pos.x;
        const currentY = pos.worldY !== undefined ? pos.worldY : pos.y;
        const currentRot = pos.worldRotation !== undefined ? pos.worldRotation : pos.rotation;

        interpolatedPos.x = prevX + (currentX - prevX) * this.alpha;
        interpolatedPos.y = prevY + (currentY - prevY) * this.alpha;

        // Shortest path rotation interpolation
        let diff = currentRot - prevRot;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        interpolatedPos.rotation = prevRot + diff * this.alpha;
      }

      return {
        entity,
        pos: interpolatedPos,
        render,
        zIndex: render.zIndex ?? 0
      };
    });

    renderCommands.sort((a, b) => a.zIndex - b.zIndex);

    renderCommands.forEach((cmd) => {
      const offset = world.getComponent<import("../core/CoreComponents").VisualOffsetComponent>(cmd.entity, "VisualOffset");
      this.drawEntity(cmd.entity, {
        Transform: cmd.pos,
        Render: cmd.render,
        VisualOffset: offset as unknown as import("../core/CoreComponents").Component
      }, world);
    });

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
    const gameState = world.getSingleton<GenericComponent>("GameState");
    const serverTick = gameState && gameState.serverTick !== undefined ? gameState.serverTick as number : null;
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

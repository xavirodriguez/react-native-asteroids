import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderSnapshot, UISnapshot } from "./RenderSnapshot";
import { RenderCommandBuffer, DrawCommand } from "./RenderCommandBuffer";
import { RenderSnapshotProvider } from "./RenderSnapshotProvider";
import { UIStyleComponent, UITextComponent, UIProgressBarComponent } from "../ui/UITypes";
import { TextRenderer } from "../ui/text/TextRenderer";

/**
 * Motor de renderizado basado en el API 2D Canvas de la Web.
 *
 * @responsibility Implementar una arquitectura basada en snapshots para un renderizado desacoplado.
 * @responsibility Generar buffers de comandos optimizados y ordenados por profundidad (zIndex).
 * @responsibility Dibujar elementos de UI procedimentales (paneles, etiquetas, barras de progreso).
 *
 * @remarks
 * ### Arquitectura de Renderizado Desacoplado:
 * Este motor no dibuja directamente el estado actual del `World`. En su lugar, utiliza un pipeline de dos fases:
 *
 * 1. **Fase de Captura (`createSnapshot`)**: Recorre el mundo ECS y extrae los datos necesarios (posición, rotación, color)
 *    hacia un objeto `RenderSnapshot` plano. En este paso se aplica la **interpolación visual** (alpha blending)
 *    y el **Frustum Culling** para ignorar entidades fuera de cámara.
 * 2. **Fase de Dibujado (`renderSnapshot`)**: Toma el snapshot y ejecuta las llamadas a la API de Canvas.
 *    Los comandos se ordenan por `zIndex` para garantizar la correcta superposición visual.
 *
 * Esta separación permite que el renderizado corra a una frecuencia distinta que la simulación física (60Hz fixed).
 *
 * @conceptualRisk [GC_PRESSURE][LOW] Aunque usa pools, el crecimiento de `entities` en el
 * snapshot más allá de `MAX_ENTITIES` (2000) causará pérdida de dibujo.
 */
export class CanvasRenderer implements Renderer {
  public readonly type = 'canvas';
  protected ctx: CanvasRenderingContext2D | null = null;
  protected width: number = 0;
  protected height: number = 0;

  private shapeDrawers = new Map<string, ShapeDrawer<CanvasRenderingContext2D>>();
  private postEntityDrawers = new Map<string, ShapeDrawer<CanvasRenderingContext2D>>();
  private preRenderHooks: ((ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void)[] = [];
  private postRenderHooks: ((ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void)[] = [];
  private backgroundEffects: { name: string, drawer: EffectDrawer<CanvasRenderingContext2D> }[] = [];
  private foregroundEffects: { name: string, drawer: EffectDrawer<CanvasRenderingContext2D> }[] = [];

  private commandBuffer = new RenderCommandBuffer();
  private readonly MAX_ENTITIES = 2000;
  private readonly MAX_UI = 200;

  private readonly snapshotA: RenderSnapshot;
  private readonly snapshotB: RenderSnapshot;
  private currentSnapshot: RenderSnapshot;

  // Reusable objects to avoid GC pressure
  private readonly tempPos = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  private readonly tempRender: { shape: string, size: number, color: string, vertices?: ReadonlyArray<{readonly x: number, readonly y: number}> | null, hitFlashFrames: number, data: Record<string, unknown> | null } =
    { shape: "", size: 0, color: "", hitFlashFrames: 0, data: null };

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) this.ctx = ctx;

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
    const uiElements = new Array(this.MAX_UI);
    for (let i = 0; i < this.MAX_UI; i++) {
        uiElements[i] = {
            id: 0, elementType: "", x: 0, y: 0, width: 0, height: 0,
            opacity: 1, visible: false, zIndex: 0
        };
    }
    return {
      entities,
      entityCount: 0,
      uiElements,
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

  public registerShape(name: string, drawer: ShapeDrawer<CanvasRenderingContext2D>): void {
    this.shapeDrawers.set(name, drawer);
  }

  public registerShapeDrawer(name: string, drawer: ShapeDrawer<CanvasRenderingContext2D>): void {
    this.registerShape(name, drawer);
  }

  public registerPostEntityDrawer(name: string, drawer: ShapeDrawer<CanvasRenderingContext2D>): void {
    this.postEntityDrawers.set(name, drawer);
  }

  public addPreRenderHook(hook: (ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void): void {
    this.preRenderHooks.push(hook);
  }

  public addPostRenderHook(hook: (ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void): void {
    this.postRenderHooks.push(hook);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<CanvasRenderingContext2D>): void {
      this.backgroundEffects.push({ name, drawer });
  }

  public registerForegroundEffect(name: string, drawer: EffectDrawer<CanvasRenderingContext2D>): void {
      this.foregroundEffects.push({ name, drawer });
  }

  private registerDefaultDrawers(): void {
    this.registerShape("circle", (ctx, _entity, _pos, _elapsedTime, render) => {
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.registerShape("rect", (ctx, _entity, _pos, _elapsedTime, render) => {
      ctx.fillStyle = render.color;
      ctx.fillRect(-render.size / 2, -render.size / 2, render.size, render.size);
    });

    this.registerShape("polygon", (ctx, _entity, _pos, _elapsedTime, render) => {
      const vertices = render.vertices;
      if (!vertices || vertices.length === 0) return;
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#333";
      if (render.hitFlashFrames > 0) {
        ctx.strokeStyle = "white";
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      }
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  public setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public clear(): void {
    if (!this.ctx) return;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public createSnapshot(world: World, alpha: number): RenderSnapshot {
    this.swapSnapshots();
    return RenderSnapshotProvider.createSnapshot(world, alpha, this.width, this.height, this.currentSnapshot);
  }

  public renderSnapshot(snapshot: RenderSnapshot, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

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
    // Background effects and pre-render hooks (Screen Space)
    ctx.save();
    for (let i = 0; i < this.backgroundEffects.length; i++) {
        this.backgroundEffects[i].drawer(ctx, snapshot, this.width, this.height, world);
    }
    for (let i = 0; i < this.preRenderHooks.length; i++) {
      this.preRenderHooks[i](ctx, snapshot, world);
    }
    ctx.restore();

    // World Space Rendering (Entities)
    ctx.save();
    // Apply Camera Transformation (Shake -> Zoom -> Translate)
    ctx.translate(snapshot.shakeX, snapshot.shakeY);
    ctx.scale(snapshot.cameraZoom, snapshot.cameraZoom);
    ctx.translate(-snapshot.cameraX, -snapshot.cameraY);

    const commands = this.commandBuffer.getCommands();
    const cmdCount = this.commandBuffer.getCount();
    for (let i = 0; i < cmdCount; i++) {
      this.executeCommand(ctx, commands[i], world, snapshot.elapsedTime);
    }
    ctx.restore();

    // Foreground effects and post-render hooks (Screen Space)
    ctx.save();
    for (let i = 0; i < this.foregroundEffects.length; i++) {
        this.foregroundEffects[i].drawer(ctx, snapshot, this.width, this.height, world);
    }
    for (let i = 0; i < this.postRenderHooks.length; i++) {
      this.postRenderHooks[i](ctx, snapshot, world);
    }
    ctx.restore();

    this.renderUIFromSnapshot(ctx, snapshot);
  }

  private executeCommand(ctx: CanvasRenderingContext2D, cmd: DrawCommand, world: World, elapsedTime: number): void {
    ctx.save();
    ctx.translate(cmd.x, cmd.y);
    ctx.rotate(cmd.rotation);
    ctx.scale(cmd.scaleX, cmd.scaleY);
    ctx.globalAlpha = cmd.opacity;

    if (cmd.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
    }

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
      drawer(ctx, cmd.entityId, this.tempPos, elapsedTime, this.tempRender, world);
    }

    ctx.restore();

    const postDrawer = this.postEntityDrawers.get(cmd.type);
    if (postDrawer) {
        postDrawer(ctx, cmd.entityId, this.tempPos, elapsedTime, this.tempRender, world);
    }
  }

  private renderUIFromSnapshot(ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot): void {
    // In-place sort of UI elements to avoid allocation
    const ui = snapshot.uiElements;
    const count = snapshot.uiCount;

    // Stable insertion sort for UI elements
    for (let i = 1; i < count; i++) {
        const key = ui[i];
        let j = i - 1;
        while (j >= 0 && ui[j].zIndex > key.zIndex) {
            ui[j + 1] = ui[j];
            j--;
        }
        ui[j + 1] = key;
    }

    for (let i = 0; i < count; i++) {
        const element = ui[i];
        if (!element.visible) continue;

        ctx.save();
        ctx.globalAlpha = element.opacity;

        switch (element.elementType) {
            case "panel":
                this.drawPanel(ctx, element);
                break;
            case "label":
                this.drawLabel(ctx, element);
                break;
            case "button":
                this.drawButton(ctx, element);
                break;
            case "progressBar":
                this.drawProgressBar(ctx, element);
                break;
        }

        ctx.restore();
    }
  }

  private drawPanel(ctx: CanvasRenderingContext2D, el: UISnapshot): void {
    const style = el.style as UIStyleComponent;
    if (!style || !style.backgroundColor) return;

    ctx.fillStyle = style.backgroundColor;
    if (style.borderRadius > 0) {
        this.drawRoundedRect(ctx, el.x, el.y, el.width, el.height, style.borderRadius);
        ctx.fill();
        if (style.borderColor && style.borderWidth > 0) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = style.borderWidth;
            ctx.stroke();
        }
    } else {
        ctx.fillRect(el.x, el.y, el.width, el.height);
        if (style.borderColor && style.borderWidth > 0) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = style.borderWidth;
            ctx.strokeRect(el.x, el.y, el.width, el.height);
        }
    }
  }

  private drawLabel(ctx: CanvasRenderingContext2D, el: UISnapshot): void {
    const text = el.text as UITextComponent;
    const style = el.style as UIStyleComponent;
    if (!text || !style) return;

    TextRenderer.drawSystemText(
        ctx, text.content, el.x, el.y, style.fontSize, style.textColor,
        style.fontFamily, style.textAlign, text.wordWrap ? el.width : undefined
    );
  }

  private drawButton(ctx: CanvasRenderingContext2D, el: UISnapshot): void {
    const btnState = el.data?.buttonState;
    const style = el.style as UIStyleComponent;

    if (style) {
        ctx.save();
        if (btnState === "pressed") ctx.globalAlpha *= 0.8;
        this.drawPanel(ctx, el);
        if (btnState === "hovered") {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            if (style.borderRadius > 0) {
                this.drawRoundedRect(ctx, el.x, el.y, el.width, el.height, style.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(el.x, el.y, el.width, el.height);
            }
        }
        ctx.restore();
    }
    if (el.text) this.drawLabel(ctx, el);
  }

  private drawProgressBar(ctx: CanvasRenderingContext2D, el: UISnapshot): void {
    const pb = el.progressBar as UIProgressBarComponent;
    const style = el.style as UIStyleComponent;
    if (!pb) return;

    ctx.fillStyle = pb.trackColor;
    ctx.fillRect(el.x, el.y, el.width, el.height);

    ctx.fillStyle = pb.fillColor;
    const fillWidth = el.width * Math.max(0, Math.min(1, pb.value));
    ctx.fillRect(el.x, el.y, fillWidth, el.height);

    if (style?.borderColor && style.borderWidth > 0) {
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = style.borderWidth;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
    }
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Main rendering pipeline using a Decoupled Snapshot strategy.
   *
   * @remarks
   * The pipeline consists of two primary phases:
   *
   * ### 1. Capture Phase (`createSnapshot`)
   * - Reads active entities with `Transform` and `Render` components.
   * - Calculates visual interpolation using `PreviousTransform` and the `alpha` factor.
   * - Aggregates global effects like screen shake from all sources.
   * - Performs **Frustum Culling**: Entities outside the camera viewport are excluded from the snapshot.
   * - Recycles pre-allocated snapshot objects to avoid GC pressure.
   *
   * ### 2. Draw Phase (`renderSnapshot`)
   * - Sorts the snapshot commands by `zIndex` using a stable sort to prevent flickering.
   * - Translates and scales the context based on camera and shake offsets.
   * - Dispatches commands to specialized `ShapeDrawer` callbacks.
   * - Draws the procedural UI system from its own snapshot.
   *
   * @param world - El mundo ECS fuente de datos.
   * @param alpha - Factor de interpolación [0, 1] para suavizado de movimiento.
   *
   * @precondition El contexto `ctx` debería haber sido establecido mediante {@link CanvasRenderer.setContext}.
   * @postcondition Se genera la imagen del frame actual en el Canvas con el fin de aplicar interpolación.
   */
  public render(world: World, alpha: number = 1): void {
    const snapshot = this.createSnapshot(world, alpha);
    this.renderSnapshot(snapshot, world);
  }

  public drawEntity(_entity: Entity, _components: Record<string, unknown>, _world: World): void {
    // Deprecated for snapshot rendering
  }

  public drawParticles(_world: World): void {
  }
}

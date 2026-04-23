import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TransformComponent, PreviousTransformComponent, GenericComponent, Camera2DComponent } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";
import { RenderSnapshot, UISnapshot } from "./RenderSnapshot";
import { CommandBuffer, DrawCommand } from "./CommandBuffer";
import { UIElementComponent, UIStyleComponent, UITextComponent, UIProgressBarComponent, UIButtonStateComponent } from "../ui/UITypes";
import { TextRenderer } from "../ui/text/TextRenderer";

/**
 * Motor de renderizado basado en el API 2D Canvas de la Web.
 *
 * @responsibility Implementar una arquitectura basada en snapshots para un renderizado desacoplado.
 * @responsibility Generar buffers de comandos optimizados y ordenados por profundidad (zIndex).
 * @responsibility Dibujar elementos de UI procedimentales (paneles, etiquetas, barras de progreso).
 *
 * @remarks
 * Es el renderizador estándar para la plataforma Web y entornos de desarrollo rápido.
 * Utiliza una estrategia destinada a mitigar las alocaciones por frame mediante el reciclaje
 * de objetos snapshot y comandos, buscando reducir la presión sobre el recolector de basura (GC).
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

  private commandBuffer = new CommandBuffer();
  private readonly MAX_ENTITIES = 2000;
  private readonly MAX_UI = 200;

  private readonly snapshotA: RenderSnapshot;
  private readonly snapshotB: RenderSnapshot;
  private currentSnapshot: RenderSnapshot;

  // Reusable objects to avoid GC pressure
  private readonly tempPos = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  private readonly tempRender: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null } =
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
    const snapshot = this.currentSnapshot;

    // 0. Camera selection and data
    const cameras = world.query("Camera2D");
    let mainCam: Camera2DComponent | null = null;
    for (const camEntity of cameras) {
      const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;
      if (cam.isMain || !mainCam) {
        mainCam = cam;
        if (cam.isMain) break;
      }
    }

    snapshot.cameraX = mainCam?.x ?? 0;
    snapshot.cameraY = mainCam?.y ?? 0;
    snapshot.cameraZoom = mainCam?.zoom ?? 1;

    // Visual viewport for culling in world space
    const cullMinX = snapshot.cameraX;
    const cullMinY = snapshot.cameraY;
    const cullMaxX = cullMinX + this.width / snapshot.cameraZoom;
    const cullMaxY = cullMinY + this.height / snapshot.cameraZoom;

    // 1. Entities
    const entities = world.query("Transform", "Render");
    let count = 0;

    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity ? world.getComponent<GenericComponent>(gameStateEntity, "GameState") : null;

    let shakeX = 0;
    let shakeY = 0;
    if (gameState?.screenShake) {
      const screenShake = gameState.screenShake as Record<string, number>;
      if (screenShake.remaining > 0 || screenShake.duration > 0) {
        const renderRandom = RandomService.getInstance("render");
        shakeX = (renderRandom.next() - 0.5) * screenShake.intensity;
        shakeY = (renderRandom.next() - 0.5) * screenShake.intensity;
      }
    }

    // Combine camera shake if present
    if (mainCam && (mainCam.shakeOffsetX !== 0 || mainCam.shakeOffsetY !== 0)) {
        shakeX += mainCam.shakeOffsetX;
        shakeY += mainCam.shakeOffsetY;
    }

    snapshot.shakeX = shakeX;
    snapshot.shakeY = shakeY;

    // Use serverTick from GameState singleton if available, otherwise fallback to performance.now()
    // We access serverTick generically to avoid coupling engine to game types
    const serverTick = gameState && (gameState as Record<string, unknown>).serverTick !== undefined ? (gameState as Record<string, unknown>).serverTick as number : null;
    snapshot.elapsedTime = serverTick !== null ? serverTick * (1000 / 60) : performance.now();

    for (let i = 0; i < entities.length; i++) {
      if (count >= this.MAX_ENTITIES) break;
      const entity = entities[i];

      const trans = world.getComponent<TransformComponent>(entity, "Transform")!;
      const prevTrans = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      const offset = world.getComponent<import("../core/CoreComponents").VisualOffsetComponent>(entity, "VisualOffset");

      const snap = snapshot.entities[count];
      snap.id = entity;

      let x = trans.worldX ?? trans.x;
      let y = trans.worldY ?? trans.y;
      let rotation = trans.worldRotation ?? trans.rotation;
      const scaleX = trans.worldScaleX ?? (trans.scaleX ?? 1);
      const scaleY = trans.worldScaleY ?? (trans.scaleY ?? 1);

      if (prevTrans && alpha < 1) {
        // Prefer world coordinates if available for consistent hierarchy interpolation
        const prevX = prevTrans.worldX !== undefined ? prevTrans.worldX : prevTrans.x;
        const prevY = prevTrans.worldY !== undefined ? prevTrans.worldY : prevTrans.y;
        const prevRot = prevTrans.worldRotation !== undefined ? prevTrans.worldRotation : prevTrans.rotation;

        x = prevX + (x - prevX) * alpha;
        y = prevY + (y - prevY) * alpha;

        let diff = rotation - prevRot;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rotation = prevRot + diff * alpha;
      }

      snap.x = x + (offset?.x ?? 0);
      snap.y = y + (offset?.y ?? 0);
      snap.rotation = rotation + (offset?.rotation ?? 0);
      snap.scaleX = scaleX + (offset?.scaleX ?? 0);
      snap.scaleY = scaleY + (offset?.scaleY ?? 0);
      snap.opacity = render.data?.opacity !== undefined ? (render.data.opacity as number) : 1;
      snap.zIndex = render.zIndex ?? 0;
      snap.shape = render.shape;
      snap.color = render.color;
      snap.size = render.size;
      snap.vertices = render.vertices || null;
      snap.hitFlashFrames = render.hitFlashFrames || 0;
      snap.data = render.data ?? null;

      // Frustum Culling: check if entity AABB intersects camera viewport
      const size = render.size;
      const margin = size * 2; // Extra margin for safe culling
      if (snap.x + margin < cullMinX || snap.x - margin > cullMaxX ||
          snap.y + margin < cullMinY || snap.y - margin > cullMaxY) {
          continue;
      }

      count++;
    }
    snapshot.entityCount = count;

    // 2. UI Elements
    const uiEntities = world.query("UIElement");
    let uiCount = 0;
    for (let i = 0; i < uiEntities.length; i++) {
        if (uiCount >= this.MAX_UI) break;
        const entity = uiEntities[i];
        const el = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        const snap = snapshot.uiElements[uiCount];

        snap.id = entity;
        snap.elementType = el.elementType;
        snap.x = el.computedX;
        snap.y = el.computedY;
        snap.width = el.computedWidth;
        snap.height = el.computedHeight;
        snap.opacity = el.opacity;
        snap.visible = el.visible;
        snap.zIndex = el.zIndex;

        // Clone UI styles/data to prevent reference leaks and ensure pure rendering
        const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");
        if (style) {
            snap.style = { ...style };
        } else {
            snap.style = null;
        }

        const text = world.getComponent<UITextComponent>(entity, "UIText");
        if (text) {
            snap.text = { ...text };
        } else {
            snap.text = null;
        }

        const pb = world.getComponent<UIProgressBarComponent>(entity, "UIProgressBar");
        if (pb) {
            snap.progressBar = { ...pb };
        } else {
            snap.progressBar = null;
        }

        const btnState = world.getComponent<UIButtonStateComponent>(entity, "UIButtonState");
        if (btnState) {
            snap.data = { buttonState: btnState.state };
        } else {
            snap.data = null;
        }

        uiCount++;
    }
    snapshot.uiCount = uiCount;

    return snapshot;
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
    // Apply Camera Transformation (including screen-space shake)
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
   * Ejecuta el pipeline de renderizado completo para el World actual.
   *
   * @remarks
   * El proceso se divide en dos fases:
   * 1. **Captura (Capture)**: Crea un {@link RenderSnapshot} interpolado del World.
   * 2. **Dibujo (Draw)**: Ejecuta los comandos del snapshot en el contexto de Canvas.
   *
   * @param world - El mundo ECS fuente de datos.
   * @param alpha - Factor de interpolación [0, 1] para suavizado de movimiento.
   *
   * @precondition El contexto `ctx` debe haber sido establecido mediante {@link CanvasRenderer.setContext}.
   * @postcondition Se genera la imagen del frame actual en el Canvas con interpolación aplicada.
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

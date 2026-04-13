import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TransformComponent, PreviousTransformComponent } from "../core/CoreComponents";
import { renderUI } from "../ui/UIRenderer";
import { RandomService } from "../utils/RandomService";
import { RenderSnapshot, RenderEntitySnapshot } from "./RenderSnapshot";
import { CommandBuffer, DrawCommand } from "./CommandBuffer";

export type ShapeDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, world: World, render: any) => void;

/**
 * Motor de renderizado basado en la API de Canvas 2D.
 *
 * @remarks
 * Implementa una arquitectura de renderizado basada en snapshots para garantizar
 * una visualización consistente y desacoplada de la simulación. El renderer es
 * "allocation-free" en su hot loop, utilizando pools pre-asignados para los comandos
 * y snapshots para evitar la presión del Garbage Collector.
 *
 * @responsibility Transformar el estado del {@link World} en representaciones visuales.
 * @responsibility Gestionar efectos de pantalla global (Screen Shake).
 * @responsibility Proveer hooks para extensiones pre y post renderizado.
 *
 * @conceptualRisk [GC_PRESSURE][LOW] Aunque el hot loop es libre de asignaciones, la
 * inicialización crea un array de 2000 entidades.
 * @conceptualRisk [CANVAS_CONTEXT_LOST][MEDIUM] En entornos móviles/Expo, el contexto de
 * canvas puede perderse, lo que requiere una gestión de reinicio no implementada aquí.
 */
export class CanvasRenderer implements Renderer {
  public readonly type = 'canvas';
  protected ctx: CanvasRenderingContext2D | null = null;
  protected width: number = 0;
  protected height: number = 0;

  private shapeDrawers = new Map<string, ShapeDrawer>();
  private postEntityDrawers = new Map<string, ShapeDrawer>();
  private preRenderHooks: ((ctx: CanvasRenderingContext2D, world: World) => void)[] = [];
  private postRenderHooks: ((ctx: CanvasRenderingContext2D, world: World) => void)[] = [];
  private backgroundEffects: ((ctx: CanvasRenderingContext2D, world: World, w: number, h: number) => void)[] = [];
  private foregroundEffects: ((ctx: CanvasRenderingContext2D, world: World, w: number, h: number) => void)[] = [];

  private commandBuffer = new CommandBuffer();

  // persistent buffer de snapshots para evitar allocs en el hot loop
  private readonly MAX_ENTITIES = 2000;
  private readonly snapshotEntities: RenderEntitySnapshot[];
  private readonly currentSnapshot: RenderSnapshot;

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) this.ctx = ctx;

    this.snapshotEntities = new Array(this.MAX_ENTITIES);
    for (let i = 0; i < this.MAX_ENTITIES; i++) {
      this.snapshotEntities[i] = {
        id: 0, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
        opacity: 1, zIndex: 0, shape: "", color: "", size: 0,
        vertices: null, hitFlashFrames: 0, data: null
      };
    }

    this.currentSnapshot = {
      entities: this.snapshotEntities,
      entityCount: 0,
      shakeX: 0,
      shakeY: 0
    };

    this.registerDefaultDrawers();
  }

  public registerShape(name: string, drawer: ShapeDrawer): void {
    this.shapeDrawers.set(name, drawer);
  }

  public registerShapeDrawer(name: string, drawer: ShapeDrawer): void {
    this.registerShape(name, drawer);
  }

  public registerPostEntityDrawer(name: string, drawer: ShapeDrawer): void {
    this.postEntityDrawers.set(name, drawer);
  }

  public addPreRenderHook(hook: (ctx: CanvasRenderingContext2D, world: World) => void): void {
    this.preRenderHooks.push(hook);
  }

  public addPostRenderHook(hook: (ctx: CanvasRenderingContext2D, world: World) => void): void {
    this.postRenderHooks.push(hook);
  }

  public registerBackgroundEffect(name: string, drawer: any): void {
    this.backgroundEffects.push(drawer);
  }

  public registerForegroundEffect(name: string, drawer: any): void {
    this.foregroundEffects.push(drawer);
  }

  private registerDefaultDrawers(): void {
    this.registerShape("circle", (ctx, _, __, render) => {
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.registerShape("rect", (ctx, _, __, render) => {
      ctx.fillStyle = render.color;
      ctx.fillRect(-render.size / 2, -render.size / 2, render.size, render.size);
    });

    this.registerShape("polygon", (ctx, _, __, render) => {
      if (!render.vertices || render.vertices.length === 0) return;
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#333";
      if (render.hitFlashFrames && render.hitFlashFrames > 0) {
        ctx.strokeStyle = "white";
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      }
      ctx.beginPath();
      ctx.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
        ctx.lineTo(render.vertices[i].x, render.vertices[i].y);
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
  public createSnapshot(world: World, alpha: number): RenderSnapshot {
    const entities = world.query("Transform", "Render");
    let count = 0;

    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity ? world.getComponent<any>(gameStateEntity, "GameState") : null;

    let shakeX = 0;
    let shakeY = 0;
    if (gameState?.screenShake && gameState.screenShake.remaining > 0) {
      const renderRandom = RandomService.getInstance("render");
      shakeX = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
      shakeY = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
    }

    this.currentSnapshot.shakeX = shakeX;
    this.currentSnapshot.shakeY = shakeY;

    for (let i = 0; i < entities.length; i++) {
      if (count >= this.MAX_ENTITIES) break;
      const entity = entities[i];

      const trans = world.getComponent<TransformComponent>(entity, "Transform")!;
      const prevTrans = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      const snap = this.snapshotEntities[count];
      snap.id = entity;

      let x = trans.worldX ?? trans.x;
      let y = trans.worldY ?? trans.y;
      let rotation = trans.worldRotation ?? trans.rotation;
      const scaleX = trans.worldScaleX ?? (trans.scaleX ?? 1);
      const scaleY = trans.worldScaleY ?? (trans.scaleY ?? 1);

      if (prevTrans && alpha < 1) {
        x = prevTrans.x + (x - prevTrans.x) * alpha;
        y = prevTrans.y + (y - prevTrans.y) * alpha;

        let diff = rotation - prevTrans.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rotation = prevTrans.rotation + diff * alpha;
      }

      snap.x = x;
      snap.y = y;
      snap.rotation = rotation;
      snap.scaleX = scaleX;
      snap.scaleY = scaleY;
      snap.opacity = (render as any).opacity ?? 1;
      snap.zIndex = (render as any).zIndex ?? 0;
      snap.shape = render.shape;
      snap.color = render.color;
      snap.size = render.size;
      snap.vertices = render.vertices || null;
      snap.hitFlashFrames = render.hitFlashFrames || 0;
      snap.data = render.data;

      count++;
    }

    this.currentSnapshot.entityCount = count;
    // We don't sort here anymore, we sort in the CommandBuffer

    return this.currentSnapshot;
  }

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
  public renderSnapshot(snapshot: RenderSnapshot, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Clear Command Buffer
    this.commandBuffer.clear();

    // 2. Populate Command Buffer from Snapshot
    for (let i = 0; i < snapshot.entityCount; i++) {
      const ent = snapshot.entities[i];
      this.commandBuffer.addCommand(
        ent.shape as any,
        ent.x,
        ent.y,
        ent.rotation,
        ent.scaleX,
        ent.scaleY,
        ent.opacity,
        ent.color,
        ent.size,
        ent.zIndex,
        ent.id,
        ent.vertices,
        ent.hitFlashFrames,
        ent.data
      );
    }

    // 3. Sort Commands
    this.commandBuffer.sort();

    // 4. Execute Commands
    this.clear();
    ctx.save();
    ctx.translate(snapshot.shakeX, snapshot.shakeY);

    for (let i = 0; i < this.backgroundEffects.length; i++) {
      this.backgroundEffects[i](ctx, world, this.width, this.height);
    }

    for (let i = 0; i < this.preRenderHooks.length; i++) {
      this.preRenderHooks[i](ctx, world);
    }

    const commands = this.commandBuffer.getCommands();
    const cmdCount = this.commandBuffer.getCount();
    for (let i = 0; i < cmdCount; i++) {
      this.executeCommand(ctx, commands[i], world);
    }

    for (let i = 0; i < this.foregroundEffects.length; i++) {
      this.foregroundEffects[i](ctx, world, this.width, this.height);
    }

    for (let i = 0; i < this.postRenderHooks.length; i++) {
      this.postRenderHooks[i](ctx, world);
    }

    ctx.restore();
    renderUI(ctx, world);
  }

  private executeCommand(ctx: CanvasRenderingContext2D, cmd: DrawCommand, world: World): void {
    ctx.save();
    ctx.translate(cmd.x, cmd.y);
    ctx.rotate(cmd.rotation);
    ctx.scale(cmd.scaleX, cmd.scaleY);
    ctx.globalAlpha = cmd.opacity;

    if (cmd.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
    }

    const drawer = this.shapeDrawers.get(cmd.type);
    if (drawer) {
      drawer(ctx, cmd.entityId, world, cmd);
    }

    ctx.restore();

    const postDrawer = this.postEntityDrawers.get(cmd.type);
    if (postDrawer) {
      postDrawer(ctx, cmd.entityId, world, cmd);
    }
  }

  public render(world: World, alpha: number = 1): void {
    const snapshot = this.createSnapshot(world, alpha);
    this.renderSnapshot(snapshot, world);
  }
}

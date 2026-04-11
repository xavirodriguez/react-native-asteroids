import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TransformComponent, PreviousTransformComponent } from "../core/CoreComponents";
import { renderUI } from "../ui/UIRenderer";
import { RandomService } from "../utils/RandomService";
import { RenderSnapshot, RenderEntitySnapshot } from "./RenderSnapshot";

export type ShapeDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, world: World, render: any) => void;

/**
 * CanvasRenderer optimizado para CERO asignaciones por frame.
 *
 * @responsibility Renderizar snapshots de forma pura y eficiente sin generar basura (GC).
 */
export class CanvasRenderer implements Renderer {
  public readonly type = 'canvas';
  protected ctx: CanvasRenderingContext2D | null = null;
  protected width: number = 0;
  protected height: number = 0;

  private shapeDrawers = new Map<string, ShapeDrawer>();
  private backgroundEffects: ((ctx: CanvasRenderingContext2D, world: World, w: number, h: number) => void)[] = [];
  private foregroundEffects: ((ctx: CanvasRenderingContext2D, world: World, w: number, h: number) => void)[] = [];

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
   * Genera un snapshot inmutable del estado del mundo sin asignaciones de memoria.
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
      let scaleX = trans.worldScaleX ?? (trans.scaleX ?? 1);
      let scaleY = trans.worldScaleY ?? (trans.scaleY ?? 1);

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
    this.sortSnapshotEntities(count);

    return this.currentSnapshot;
  }

  /**
   * In-place insertion sort para evitar allocs de array.
   */
  private sortSnapshotEntities(count: number): void {
    for (let i = 1; i < count; i++) {
      const key = this.snapshotEntities[i];
      const keyZ = key.zIndex;
      let j = i - 1;
      while (j >= 0 && this.snapshotEntities[j].zIndex > keyZ) {
        this.snapshotEntities[j + 1] = this.snapshotEntities[j];
        j = j - 1;
      }
      this.snapshotEntities[j + 1] = key;
    }
  }

  /**
   * Renderiza un snapshot de forma pura.
   */
  public renderSnapshot(snapshot: RenderSnapshot, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.clear();
    ctx.save();
    ctx.translate(snapshot.shakeX, snapshot.shakeY);

    for (let i = 0; i < this.backgroundEffects.length; i++) {
      this.backgroundEffects[i](ctx, world, this.width, this.height);
    }

    // Render sorted entities from the pool
    for (let i = 0; i < snapshot.entityCount; i++) {
      this.drawEntitySnapshot(ctx, snapshot.entities[i], world);
    }

    for (let i = 0; i < this.foregroundEffects.length; i++) {
      this.foregroundEffects[i](ctx, world, this.width, this.height);
    }

    ctx.restore();
    renderUI(ctx, world);
  }

  private drawEntitySnapshot(ctx: CanvasRenderingContext2D, ent: RenderEntitySnapshot, world: World): void {
    ctx.save();
    ctx.translate(ent.x, ent.y);
    ctx.rotate(ent.rotation);
    ctx.scale(ent.scaleX, ent.scaleY);
    ctx.globalAlpha = ent.opacity;

    if (ent.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
    }

    const drawer = this.shapeDrawers.get(ent.shape);
    if (drawer) {
      drawer(ctx, ent.id, world, ent);
    }

    ctx.restore();
  }

  public render(world: World, alpha: number = 1): void {
    const snapshot = this.createSnapshot(world, alpha);
    this.renderSnapshot(snapshot, world);
  }
}

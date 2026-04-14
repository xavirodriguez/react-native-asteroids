import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TransformComponent, PreviousTransformComponent, Component } from "../core/CoreComponents";
import { renderUI } from "../ui/UIRenderer";
import { RandomService } from "../utils/RandomService";
import { RenderSnapshot } from "./RenderSnapshot";
import { CommandBuffer, DrawCommand } from "./CommandBuffer";

export type ShapeDrawer = (
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  pos: TransformComponent,
  render: RenderComponent,
  world: World
) => void;

/**
 * 2D Canvas-based Rendering Engine.
 *
 * @remarks
 * Implements a snapshot-based architecture for decoupled and consistent rendering.
 * Allocation-free in the hot loop using pooled commands and double-buffered snapshots.
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
  private readonly MAX_ENTITIES = 2000;

  private readonly snapshotA: RenderSnapshot;
  private readonly snapshotB: RenderSnapshot;
  private currentSnapshot: RenderSnapshot;

  // Reusable component objects to avoid GC pressure
  private readonly tempPos: TransformComponent = {
    type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
    worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1
  };

  private readonly tempRender: RenderComponent = {
    type: "Render", shape: "", size: 0, color: "", rotation: 0, zIndex: 0
  };

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
    return {
      entities,
      entityCount: 0,
      shakeX: 0,
      shakeY: 0
    };
  }

  private swapSnapshots(): void {
    this.currentSnapshot = this.currentSnapshot === this.snapshotA ? this.snapshotB : this.snapshotA;
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
    this.registerShape("circle", (ctx, _entity, _pos, render) => {
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.registerShape("rect", (ctx, _entity, _pos, render) => {
      ctx.fillStyle = render.color;
      ctx.fillRect(-render.size / 2, -render.size / 2, render.size, render.size);
    });

    this.registerShape("polygon", (ctx, _entity, _pos, render) => {
      const vertices = render.vertices;
      if (!vertices || vertices.length === 0) return;
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#333";
      if (render.hitFlashFrames && render.hitFlashFrames > 0) {
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

    snapshot.shakeX = shakeX;
    snapshot.shakeY = shakeY;

    for (let i = 0; i < entities.length; i++) {
      if (count >= this.MAX_ENTITIES) break;
      const entity = entities[i];

      const trans = world.getComponent<TransformComponent>(entity, "Transform")!;
      const prevTrans = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      const snap = snapshot.entities[count];

      // Introduce dirty flags to avoid unnecessary recomputation
      const isDirty = (trans as any).dirty || (render as any).dirty || count >= snapshot.entityCount;

      if (isDirty || alpha < 1) {
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
      }

      count++;
    }

    snapshot.entityCount = count;
    return snapshot;
  }

  public renderSnapshot(snapshot: RenderSnapshot, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.commandBuffer.clear();

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

    this.commandBuffer.sort();

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
      // Use reusable objects to avoid per-frame allocations
      const pos = this.tempPos;
      pos.x = cmd.x;
      pos.y = cmd.y;
      pos.rotation = cmd.rotation;
      pos.scaleX = cmd.scaleX;
      pos.scaleY = cmd.scaleY;
      pos.worldX = cmd.x;
      pos.worldY = cmd.y;
      pos.worldRotation = cmd.rotation;
      pos.worldScaleX = cmd.scaleX;
      pos.worldScaleY = cmd.scaleY;

      const render = this.tempRender;
      render.shape = cmd.type;
      render.size = cmd.size;
      render.color = cmd.color;
      render.rotation = cmd.rotation;
      render.vertices = cmd.vertices || undefined;
      render.zIndex = cmd.zIndex;
      render.hitFlashFrames = cmd.hitFlashFrames;
      render.data = cmd.data;

      drawer(ctx, cmd.entityId, pos, render, world);
    }

    ctx.restore();

    const postDrawer = this.postEntityDrawers.get(cmd.type);
    if (postDrawer) {
      const pos = this.tempPos;
      pos.x = cmd.x;
      pos.y = cmd.y;
      pos.rotation = cmd.rotation;
      pos.scaleX = cmd.scaleX;
      pos.scaleY = cmd.scaleY;
      pos.worldX = cmd.x;
      pos.worldY = cmd.y;
      pos.worldRotation = cmd.rotation;
      pos.worldScaleX = cmd.scaleX;
      pos.worldScaleY = cmd.scaleY;

      const render = this.tempRender;
      render.shape = cmd.type;
      render.size = cmd.size;
      render.color = cmd.color;
      render.rotation = cmd.rotation;
      render.vertices = cmd.vertices || undefined;
      render.zIndex = cmd.zIndex;
      render.hitFlashFrames = cmd.hitFlashFrames;
      render.data = cmd.data;

      postDrawer(ctx, cmd.entityId, pos, render, world);
    }
  }

  public render(world: World, alpha: number = 1): void {
    const snapshot = this.createSnapshot(world, alpha);
    this.renderSnapshot(snapshot, world);
  }

  public drawEntity(entity: Entity, components: Record<string, Component>, world: World): void {
    const pos = components["Transform"] as TransformComponent;
    const render = components["Render"] as RenderComponent;
    if (!pos || !render || !this.ctx) return;

    this.ctx.save();
    this.ctx.translate(pos.worldX ?? pos.x, pos.worldY ?? pos.y);
    this.ctx.rotate(pos.worldRotation ?? pos.rotation);
    this.ctx.scale(pos.worldScaleX ?? (pos.scaleX ?? 1), pos.worldScaleY ?? (pos.scaleY ?? 1));

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
      drawer(this.ctx, entity, pos, render, world);
    }

    this.ctx.restore();
  }

  public drawParticles(_world: World): void {
  }
}

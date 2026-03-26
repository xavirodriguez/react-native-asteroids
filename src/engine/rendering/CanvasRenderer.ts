import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent } from "../types/EngineTypes";

export type ShapeDrawer = (
  ctx: CanvasRenderingContext2D,
  render: RenderComponent,
  world: World,
  entity: Entity
) => void;

export type RenderEffect = (
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number
) => void;

/**
 * Procedural Canvas 2D Renderer implementation.
 * Refactored to use a shape registry and effect hooks for extensibility.
 */
export class CanvasRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;
  private shapeRegistry: Map<string, ShapeDrawer> = new Map();
  private backgroundEffects: RenderEffect[] = [];
  private foregroundEffects: RenderEffect[] = [];

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) {
      this.ctx = ctx;
    }
    this.registerDefaultShapes();
  }

  private registerDefaultShapes(): void {
    this.registerShape("circle", (ctx, render) => {
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.registerShape("polygon", (ctx, render) => {
      if (!render.vertices || render.vertices.length === 0) {
        ctx.fillStyle = render.color;
        ctx.beginPath();
        ctx.arc(0, 0, render.size, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.strokeStyle = render.color || "#aaa";
      ctx.lineWidth = 2;

      if (render.hitFlashFrames && render.hitFlashFrames > 0) {
        ctx.strokeStyle = "white";
      }

      ctx.beginPath();
      ctx.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
        ctx.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    this.registerShape("line", (ctx, render) => {
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-render.size / 2, 0);
      ctx.lineTo(render.size / 2, 0);
      ctx.stroke();
    });
  }

  public registerShape(name: string, drawer: ShapeDrawer): void {
    this.shapeRegistry.set(name, drawer);
  }

  public registerBackgroundEffect(effect: RenderEffect): void {
    this.backgroundEffects.push(effect);
  }

  public registerForegroundEffect(effect: RenderEffect): void {
    this.foregroundEffects.push(effect);
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

  public render(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.clear();

    // Draw background effects
    this.backgroundEffects.forEach((effect) => effect(ctx, world, this.width, this.height));

    ctx.save();

    // Render Entities
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (pos && render) {
        this.drawEntity(entity, pos, render, world);
      }
    });

    this.drawParticles(world);

    ctx.restore();

    // Draw foreground effects
    this.foregroundEffects.forEach((effect) => effect(ctx, world, this.width, this.height));
  }

  public drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    const drawer = this.shapeRegistry.get(render.shape);
    if (drawer) {
      drawer(ctx, render, world, entity);
    }

    ctx.restore();
  }

  public drawParticles(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const entities = world.query("Position", "Render").filter((e) => {
      const r = world.getComponent<RenderComponent>(e, "Render");
      return r?.shape === "particle";
    });

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (!ttl) return;

      const alpha = ttl.remaining / ttl.total;
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Improvement 1: Improved particles
      const randomVar = entity % 20;
      ctx.fillStyle = `hsl(${30 + randomVar}, 100%, ${50 + alpha * 30}%)`;
      ctx.globalAlpha = alpha;

      const size = render.size * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

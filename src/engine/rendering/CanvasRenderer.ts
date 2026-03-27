import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent } from "../types/EngineTypes";

/**
 * Procedural Canvas 2D Renderer implementation.
 * Generic and extensible via Shape and Effect registries.
 */
export class CanvasRenderer implements Renderer {
  public readonly type = "canvas";
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;

  private shapeRegistry = new Map<string, ShapeDrawer<CanvasRenderingContext2D>>();
  private backgroundEffects = new Map<string, EffectDrawer<CanvasRenderingContext2D>>();
  private foregroundEffects = new Map<string, EffectDrawer<CanvasRenderingContext2D>>();

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) {
      this.ctx = ctx;
    }
  }

  public setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public registerShape(name: string, drawer: ShapeDrawer<CanvasRenderingContext2D>): void {
    this.shapeRegistry.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<CanvasRenderingContext2D>): void {
    this.backgroundEffects.set(name, drawer);
  }

  public registerForegroundEffect(name: string, drawer: EffectDrawer<CanvasRenderingContext2D>): void {
    this.foregroundEffects.set(name, drawer);
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

    // Background Effects
    ctx.save();
    this.backgroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));
    ctx.restore();

    // Render Entities
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (pos && render && render.shape !== "particle") {
        this.drawEntity(entity, pos, render, world);
      }
    });

    this.drawParticles(world);

    // Foreground Effects
    ctx.save();
    this.foregroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));
    ctx.restore();
  }

  public drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    const customDrawer = this.shapeRegistry.get(render.shape);
    if (customDrawer) {
      customDrawer(ctx, entity, pos, render, world);
    } else {
      this.drawPrimitive(ctx, entity, pos, render, world);
    }

    ctx.restore();
  }

  private drawPrimitive(
    ctx: CanvasRenderingContext2D,
    _entity: Entity,
    _pos: PositionComponent,
    render: RenderComponent,
    _world: World
  ): void {
    switch (render.shape) {
      case "polygon":
        if (render.vertices) this.drawPolygon(ctx, render.vertices, render.color, render.hitFlashFrames);
        break;
      case "circle":
        this.drawCircle(ctx, render.size, render.color);
        break;
      case "flash":
        this.drawFlash(ctx, _world, _entity, render.size);
        break;
      case "line":
        this.drawLine(ctx, render.size, render.color);
        break;
    }
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

      const hue = 30 + (entity % 20);
      const lightness = 50 + alpha * 30;
      ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
      ctx.globalAlpha = alpha;

      const size = render.size * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, vertices: { x: number; y: number }[], color: string, hitFlashFrames?: number): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    if (hitFlashFrames && hitFlashFrames > 0) {
      ctx.strokeStyle = "white";
    }

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawCircle(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlash(ctx: CanvasRenderingContext2D, world: World, entity: Entity, size: number): void {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    if (!ttl) return;
    ctx.globalAlpha = (ttl.remaining / ttl.total) * 0.5;
    ctx.fillStyle = "white";
    ctx.shadowColor = "white";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLine(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.stroke();
  }
}

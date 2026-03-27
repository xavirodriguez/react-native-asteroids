import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent } from "../types/EngineTypes";
import { GameStateComponent } from "../../games/asteroids/types/AsteroidTypes";

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
    this.registerDefaultShapes();
  }

  private registerDefaultShapes(): void {
    this.registerShape("circle", (ctx, _entity, _pos, render) => {
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.registerShape("polygon", (ctx, _entity, _pos, render) => {
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

      // Requirement 5: Polygonal asteroids
      ctx.beginPath();
      ctx.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
        ctx.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    this.registerShape("line", (ctx, _entity, _pos, render) => {
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-render.size / 2, 0);
      ctx.lineTo(render.size / 2, 0);
      ctx.stroke();
    });
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

    ctx.save(); // Requirement 4: Global save for screen shake

    // Handle screen shake
    const [gameStateEntity] = world.query("GameState");
    if (gameStateEntity !== undefined) {
        const gameState = world.getComponent<GameStateComponent>(gameStateEntity, "GameState");
        if (gameState?.screenShake && gameState.screenShake.duration > 0) {
            const shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
            const shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
            ctx.translate(shakeX, shakeY);
        }
    }

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
        this.drawEntity(entity, { Position: pos, Render: render }, world);
      }
    });

    this.drawParticles(world);

    // Foreground Effects
    ctx.save();
    this.foregroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));
    ctx.restore();

    ctx.restore(); // Restore global shake
  }

  public drawEntity(entity: Entity, components: Record<string, any>, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const pos = components["Position"] as PositionComponent;
    const render = components["Render"] as RenderComponent;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    const customDrawer = this.shapeRegistry.get(render.shape);
    if (customDrawer) {
      customDrawer(ctx, entity, pos, render, world);
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

      // Requirement 1: Orange-red-white shift
      const hue = 30 + (entity % 20); // 30 (Orange) to 50 (Yellow-ish)
      const lightness = 50 + alpha * 30; // 50 (Orange/Red) to 80 (White-ish)
      ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
      ctx.globalAlpha = alpha;

      // Requirement 1: Size variation that reduces with time
      const size = render.size * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

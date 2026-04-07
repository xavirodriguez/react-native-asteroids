import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { PositionComponent, RenderComponent, TTLComponent } from "../core/CoreComponents";

export type ShapeDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, world: World, render: RenderComponent) => void;

/**
 * Procedural Canvas 2D Renderer implementation.
 * Generic and extensible via shape drawers.
 */
export class CanvasRenderer implements Renderer {
  protected ctx: CanvasRenderingContext2D | null = null;
  protected width: number = 0;
  protected height: number = 0;
  private shapeDrawers = new Map<string, ShapeDrawer>();
  private preRenderHooks: ((ctx: CanvasRenderingContext2D, world: World) => void)[] = [];
  private postRenderHooks: ((ctx: CanvasRenderingContext2D, world: World) => void)[] = [];

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) {
      this.ctx = ctx;
    }
    this.registerDefaultDrawers();
  }

  public registerShapeDrawer(shape: string, drawer: ShapeDrawer): void {
    this.shapeDrawers.set(shape, drawer);
  }

  public addPreRenderHook(hook: (ctx: CanvasRenderingContext2D, world: World) => void): void {
    this.preRenderHooks.push(hook);
  }

  public addPostRenderHook(hook: (ctx: CanvasRenderingContext2D, world: World) => void): void {
    this.postRenderHooks.push(hook);
  }

  private registerDefaultDrawers(): void {
    this.registerShapeDrawer("circle", (ctx, _, __, render) => {
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.registerShapeDrawer("rect", (ctx, _, __, render) => {
      ctx.fillStyle = render.color;
      ctx.fillRect(-render.size / 2, -render.size / 2, render.size, render.size);
    });

    this.registerShapeDrawer("polygon", (ctx, _, __, render) => {
      if (!render.vertices || render.vertices.length === 0) return;
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#333";
      if (render.data?.hitFlashFrames && render.data.hitFlashFrames > 0) {
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

      if (render.data?.internalLines) {
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1;
        render.data.internalLines.forEach((line: any) => {
          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.stroke();
        });
      }
    });

    this.registerShapeDrawer("line", (ctx, _, __, render) => {
      ctx.strokeStyle = render.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-render.size / 2, 0);
      ctx.lineTo(render.size / 2, 0);
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

  public render(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.clear();

    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity
      ? (world.getComponent<any>(gameStateEntity, "GameState"))
      : null;

    let shakeX = 0;
    let shakeY = 0;
    if (gameState?.screenShake && gameState.screenShake.framesLeft > 0) {
      shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
      shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.preRenderHooks.forEach(hook => hook(ctx, world));

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

    this.postRenderHooks.forEach(hook => hook(ctx, world));
  }

  public drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    if (render.data?.hitFlashFrames && render.data.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
    }

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
        drawer(ctx, entity, world, render);
    }

    ctx.restore();
  }

  public drawParticles(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const entities = world.query("Position", "Render").filter(e => {
        const r = world.getComponent<RenderComponent>(e, "Render");
        return r?.shape === "particle";
    });

    entities.forEach(entity => {
        const pos = world.getComponent<PositionComponent>(entity, "Position")!;
        const render = world.getComponent<RenderComponent>(entity, "Render")!;
        const ttl = world.getComponent<TTLComponent>(entity, "TTL");
        if (!ttl) return;

        const lifeRatio = ttl.remaining / ttl.total;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.globalAlpha = lifeRatio;

        let hue = 20;
        let saturation = 100;
        let lightness = 50;

        if (lifeRatio > 0.8) {
            lightness = 100;
        } else if (lifeRatio > 0.4) {
            hue = 30;
            lightness = 50 + (0.8 - lifeRatio) * 50;
        } else {
            hue = 0;
            lightness = 25 + lifeRatio * 60;
        }

        const hueVariation = (entity % 10) - 5;
        ctx.fillStyle = `hsl(${hue + hueVariation}, ${saturation}%, ${lightness}%)`;

        if (lifeRatio > 0.8) {
            ctx.shadowColor = "#ffffaa";
            ctx.shadowBlur = 10;
        }

        const size = render.size * lifeRatio;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
  }
}

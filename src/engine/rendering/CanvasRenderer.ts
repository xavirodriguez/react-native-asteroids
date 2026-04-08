import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { PositionComponent, RenderComponent, TTLComponent, TransformComponent, ColliderComponent, VelocityComponent } from "../core/CoreComponents";
import { UITextComponent, UIStyleComponent } from "../ui/UITypes";
import { FontRegistry } from "../ui/text/FontRegistry";
import { TextRenderer } from "../ui/text/TextRenderer";
import { renderUI } from "../ui/UIRenderer";
import { DebugConfigComponent } from "../ui/debug/DebugTypes";

export type ShapeDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, world: World, render: RenderComponent) => void;

/**
 * Procedural Canvas 2D Renderer implementation.
 * Generic and extensible via shape drawers.
 */
export class CanvasRenderer implements Renderer {
  public readonly type = "canvas";
  protected ctx: CanvasRenderingContext2D | null = null;
  protected width: number = 0;
  protected height: number = 0;
  private shapeDrawers = new Map<string, ShapeDrawer>();
  private postEntityDrawers = new Map<string, ShapeDrawer>();
  private preRenderHooks: ((ctx: CanvasRenderingContext2D, world: World) => void)[] = [];
  private postRenderHooks: ((ctx: CanvasRenderingContext2D, world: World) => void)[] = [];
  private backgroundEffects: ((ctx: CanvasRenderingContext2D, world: World, w: number, h: number) => void)[] = [];
  private foregroundEffects: ((ctx: CanvasRenderingContext2D, world: World, w: number, h: number) => void)[] = [];

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) {
      this.ctx = ctx;
    }
    this.registerDefaultDrawers();
  }

  public registerShapeDrawer(shape: string, drawer: ShapeDrawer): void {
    this.shapeDrawers.set(shape, drawer);
  }

  public registerPostEntityDrawer(shape: string, drawer: ShapeDrawer): void {
    this.postEntityDrawers.set(shape, drawer);
  }

  public registerShape(name: string, drawer: any): void {
      this.registerShapeDrawer(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: any): void {
      this.backgroundEffects.push(drawer);
  }

  public registerForegroundEffect(name: string, drawer: any): void {
      this.foregroundEffects.push(drawer);
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

    this.registerShapeDrawer("text", (ctx, entity, world, render) => {
      const uiText = world.getComponent<UITextComponent>(entity, "UIText");
      const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");
      if (!uiText) return;

      const registry = FontRegistry.getInstance();
      const fontName = style?.fontFamily || registry.getDefaultName();

      TextRenderer.drawSystemText(
          ctx,
          uiText.content,
          0, 0,
          style?.fontSize ?? 16,
          style?.textColor ?? render.color ?? "white",
          fontName,
          style?.textAlign ?? "left"
      );
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

    this.backgroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));

    const entities = world.query("Transform", "Render");

    const renderCommands = entities.map(entity => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      return {
        entity,
        pos,
        render,
        zIndex: (render as any).zIndex ?? 0
      };
    });

    this.preRenderHooks.forEach(hook => hook(ctx, world));

    renderCommands.sort((a, b) => a.zIndex - b.zIndex);

    renderCommands.forEach((cmd) => {
      this.drawEntity(cmd.entity, { Transform: cmd.pos, Render: cmd.render }, world);
    });

    ctx.save();
    this.foregroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));
    ctx.restore();

    ctx.restore(); // Balanced restore for shake - UI should NOT shake usually

    renderUI(ctx, world);

    const debugConfigEntity = world.query("DebugConfig")[0];
    if (debugConfigEntity !== undefined) {
        this.renderDebugInfo(ctx, world);
    }

    this.postRenderHooks.forEach(hook => hook(ctx, world));
  }

  public drawEntity(entity: Entity, components: Record<string, any>, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const pos = components["Transform"] as TransformComponent;
    const render = components["Render"] as RenderComponent;

    ctx.save();

    const x = (pos as any).worldX !== undefined ? (pos as any).worldX : pos.x;
    const y = (pos as any).worldY !== undefined ? (pos as any).worldY : pos.y;
    const rotation = (pos as any).worldRotation !== undefined ? (pos as any).worldRotation : render.rotation;

    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (render.data?.hitFlashFrames && render.data.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
    }

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
        drawer(ctx, entity, world, render);
    }

    ctx.restore();

    const postDrawer = this.postEntityDrawers.get(render.shape);
    if (postDrawer) {
        postDrawer(ctx, entity, world, render);
    }
  }

  public drawParticles(world: World): void {
  }

  private renderDebugInfo(ctx: CanvasRenderingContext2D, world: World): void {
      const config = world.getSingleton<DebugConfigComponent>("DebugConfig");
      if (!config) return;

      const entities = world.getAllEntities();
      for (const entity of entities) {
          const pos = world.getComponent<PositionComponent>(entity, "Position") ||
                      world.getComponent<any>(entity, "Transform");
          if (!pos) continue;

          if (config.showColliders) {
              const collider = world.getComponent<ColliderComponent>(entity, "Collider");
              if (collider) {
                  ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.arc(pos.x, pos.y, collider.radius, 0, Math.PI * 2);
                  ctx.stroke();
              }
          }

          if (config.showVelocities) {
              const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
              if (vel) {
                  ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
                  ctx.beginPath();
                  ctx.moveTo(pos.x, pos.y);
                  ctx.lineTo(pos.x + vel.dx * 0.2, pos.y + vel.dy * 0.2);
                  ctx.stroke();
              }
          }

          if (config.showEntityIds) {
              ctx.fillStyle = "white";
              ctx.font = "10px monospace";
              ctx.fillText(`#${entity}`, pos.x, pos.y - 10);
          }
      }
  }
}

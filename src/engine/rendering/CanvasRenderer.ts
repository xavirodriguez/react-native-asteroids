import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TTLComponent, TransformComponent, Component, TilemapComponent } from "../core/CoreComponents";
import { renderUI } from "../ui/UIRenderer";
import { UITextComponent, UIStyleComponent } from "../ui/UITypes";
import { FontRegistry } from "../ui/text/FontRegistry";
import { TextRenderer } from "../ui/text/TextRenderer";
import { DebugSystem } from "../ui/debug/DebugSystem";
import { RandomService } from "../utils/RandomService";

export type ShapeDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, world: World, render: RenderComponent) => void;

/**
 * Procedural Canvas 2D Renderer implementation.
 * Generic and extensible via shape drawers.
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
  private debugSystem: DebugSystem = new DebugSystem();

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
    if (gameState?.screenShake && gameState.screenShake.remaining > 0) {
      const renderRandom = RandomService.getInstance("render");
      shakeX = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
      shakeY = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
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

  public drawEntity(entity: Entity, components: Record<string, Component>, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const pos = components["Transform"] as TransformComponent;
    const render = components["Render"] as RenderComponent;

    if (!pos || !render) return;

    // Use world coordinates from HierarchySystem (single source of truth)
    const x = pos.worldX !== undefined ? pos.worldX : pos.x;
    const y = pos.worldY !== undefined ? pos.worldY : pos.y;
    const rotation = pos.worldRotation !== undefined ? pos.worldRotation : render.rotation;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
    }

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
        drawer(ctx, entity, world, render);
    }

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";

    const postDrawer = this.postEntityDrawers.get(render.shape);
    if (postDrawer) {
        postDrawer(ctx, entity, world, render);
    }
  }

  public drawParticles(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const entities = world.query("Transform", "Render").filter(e => {
        const r = world.getComponent<RenderComponent>(e, "Render");
        return r?.shape === "particle";
    });

    entities.forEach(entity => {
        const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
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

  public drawTilemaps(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const tilemaps = world.query("Tilemap");

    tilemaps.forEach(entity => {
        const tilemap = world.getComponent<TilemapComponent>(entity, "Tilemap")!;
        const range = (tilemap as any)._visibleRange || {
            startX: 0, startY: 0, endX: tilemap.data.width, endY: tilemap.data.height
        };

        for (const layer of tilemap.data.layers) {
            for (let y = range.startY; y < range.endY; y++) {
                for (let x = range.startX; x < range.endX; x++) {
                    const tileId = layer.tiles[y * tilemap.data.width + x];
                    if (tileId === 0) continue;

                    const tileset = tilemap.data.tilesets.find(ts => ts.id === tileId);
                    if (tileset) {
                        // Drawing logic for tile (using simple color for now as textures require loading)
                        ctx.fillStyle = tileset.solid ? "#555" : "#333";
                        ctx.fillRect(
                            x * tilemap.data.tileSize,
                            y * tilemap.data.tileSize,
                            tilemap.data.tileSize,
                            tilemap.data.tileSize
                        );
                    }
                }
            }
        }
    });
  }

  private renderDebugInfo(ctx: CanvasRenderingContext2D, world: World): void {
      this.debugSystem.update(world, 0);
      this.debugSystem.renderDebug(ctx, world);
  }
}

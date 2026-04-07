import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { RandomService } from "../utils/RandomService";
import { Entity, TransformComponent, RenderComponent, ScreenShakeComponent, AnimatorComponent, Camera2DComponent } from "../types/EngineTypes";
import { RandomService } from "../utils/RandomService";

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

    ctx.save(); // Global save for potential transform effects

    // Apply Camera transform and Screen Shake
    // Note: Using Math.random() for visual shake to avoid gameplay seed drift
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    const renderRandom = RandomService.getInstance("render");
    if (cam) {
      const shakeX = (RandomService.next() - 0.5) * cam.shakeIntensity;
      const shakeY = (RandomService.next() - 0.5) * cam.shakeIntensity;
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x + shakeX, -cam.y + shakeY);
    } else {
      // Fallback to legacy Screen Shake if present (promoted from Asteroids to Engine)
      const shake = world.getSingleton<ScreenShakeComponent>("ScreenShake");
      if (shake?.config && shake.config.duration > 0) {
        const { intensity } = shake.config;
        const shakeX = (RandomService.next() - 0.5) * intensity;
        const shakeY = (RandomService.next() - 0.5) * intensity;
        ctx.translate(shakeX, shakeY);
      }
    }

    // Background Effects (e.g., Starfield)
    this.backgroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));

    // Render Pipeline: Collect, Sort, Execute
    const entities = world.query("Transform", "Render");

    // Command-based sorting by zIndex
    const renderCommands = entities.map(entity => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      return {
        entity,
        pos,
        render,
        zIndex: render.zIndex ?? 0
      };
    });

    renderCommands.sort((a, b) => a.zIndex - b.zIndex);

    // Render Tilemaps first
    this.drawTilemaps(world);

    // Execute draw commands
    renderCommands.forEach((cmd) => {
      this.drawEntity(cmd.entity, { Transform: cmd.pos, Render: cmd.render }, world);
    });

    // Foreground Effects (e.g., CRT)
    ctx.save();
    this.foregroundEffects.forEach((drawer) => drawer(ctx, world, this.width, this.height));
    ctx.restore();

    ctx.restore(); // Restore global transform
  }

  public drawEntity(entity: Entity, components: Record<string, any>, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const pos = components["Transform"] as TransformComponent;
    const render = components["Render"] as RenderComponent;

    // Use world coordinates from HierarchySystem (single source of truth)
    const x = pos.worldX !== undefined ? pos.worldX : pos.x;
    const y = pos.worldY !== undefined ? pos.worldY : pos.y;
    const rotation = pos.worldRotation !== undefined ? pos.worldRotation : render.rotation;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Scale support
    const scaleX = pos.worldScaleX !== undefined ? pos.worldScaleX : (pos.scaleX ?? 1);
    const scaleY = pos.worldScaleY !== undefined ? pos.worldScaleY : (pos.scaleY ?? 1);
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }

    const customDrawer = this.shapeRegistry.get(render.shape);
    if (customDrawer) {
      // Check if entity has an animator and apply frame mapping
      const animator = world.getComponent<AnimatorComponent>(entity, "Animator");
      if (animator) {
        const config = animator.animations[animator.current];
        if (config) {
          const currentFrame = config.frames[animator.frame];
          // We can pass frame info to drawers via custom components or extended interface
          (render as any)._currentFrame = currentFrame;
        }
      }

      customDrawer(ctx, entity, pos, render, world);
    }

    ctx.restore();
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

      ctx.save();
      const tileSize = tilemap.data.tileSize;

      for (const layer of tilemap.data.layers) {
        for (let y = range.startY; y < range.endY; y++) {
          for (let x = range.startX; x < range.endX; x++) {
            const index = y * tilemap.data.width + x;
            const tileId = layer.tiles[index];
            if (tileId !== 0) {
              // Simulating tile rendering: rectangle with color based on ID
              ctx.fillStyle = `rgb(${(tileId * 50) % 255}, ${(tileId * 100) % 255}, ${(tileId * 150) % 255})`;
              ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
          }
        }
      }
      ctx.restore();
    });
  }

  public drawParticles(world: World): void {
    // Optimized particle batching could go here in the future
  }
}

import { Skia, SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity } from "../core/Entity";
import { RenderComponent, TTLComponent, TransformComponent } from "../core/CoreComponents";

export type SkiaShapeDrawer = (canvas: SkCanvas, entity: Entity, world: World, render: RenderComponent, paint: SkPaint) => void;

/**
 * Procedural Skia Renderer implementation.
 * Generic and extensible via shape drawers.
 */
export class SkiaRenderer implements Renderer {
  protected canvas: SkCanvas | null = null;
  protected width: number = 0;
  protected height: number = 0;
  protected paint: SkPaint;
  private shapeDrawers = new Map<string, SkiaShapeDrawer>();
  private postEntityDrawers = new Map<string, SkiaShapeDrawer>();
  private preRenderHooks: ((canvas: SkCanvas, world: World) => void)[] = [];
  private postRenderHooks: ((canvas: SkCanvas, world: World) => void)[] = [];

  constructor(canvas?: any) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.paint = Skia.Paint();
    this.registerDefaultDrawers();
  }

  public registerShapeDrawer(shape: string, drawer: SkiaShapeDrawer): void {
    this.shapeDrawers.set(shape, drawer);
  }

  public registerPostEntityDrawer(shape: string, drawer: SkiaShapeDrawer): void {
    this.postEntityDrawers.set(shape, drawer);
  }

  public addPreRenderHook(hook: (canvas: SkCanvas, world: World) => void): void {
    this.preRenderHooks.push(hook);
  }

  public addPostRenderHook(hook: (canvas: SkCanvas, world: World) => void): void {
    this.postRenderHooks.push(hook);
  }

  private registerDefaultDrawers(): void {
    this.registerShapeDrawer("circle", (canvas, _, __, render, paint) => {
      paint.setColor(Skia.Color(render.color));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, 0, render.size, paint);
    });

    this.registerShapeDrawer("rect", (canvas, _, __, render, paint) => {
      paint.setColor(Skia.Color(render.color));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-render.size / 2, -render.size / 2, render.size, render.size), paint);
    });

    this.registerShapeDrawer("polygon", (canvas, _, __, render, paint) => {
      if (!render.vertices || render.vertices.length === 0) return;

      const path = Skia.Path.Make();
      path.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
          path.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      path.close();

      const isHitFlash = render.data?.hitFlashFrames && render.data.hitFlashFrames > 0;
      paint.setColor(isHitFlash ? Skia.Color("rgba(255, 255, 255, 0.5)") : Skia.Color("#333"));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(path, paint);

      paint.setColor(isHitFlash ? Skia.Color("white") : Skia.Color(render.color));
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      canvas.drawPath(path, paint);

      if (render.data?.internalLines) {
          paint.setColor(Skia.Color("#222"));
          paint.setStrokeWidth(1);
          render.data.internalLines.forEach((line: any) => {
              canvas.drawLine(line.x1, line.y1, line.x2, line.y2, paint);
          });
      }
    });

    this.registerShapeDrawer("line", (canvas, _, __, render, paint) => {
      paint.setColor(Skia.Color(render.color));
      paint.setStrokeWidth(2);
      canvas.drawLine(-render.size / 2, 0, render.size / 2, 0, paint);
    });
  }

  public setCanvas(canvas: SkCanvas): void {
    this.canvas = canvas;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public clear(): void {
    if (!this.canvas) return;
    this.canvas.clear(Skia.Color("black"));
  }

  public render(world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

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

    canvas.save();
    canvas.translate(shakeX, shakeY);

    this.preRenderHooks.forEach(hook => hook(canvas, world));

    const entities = world.query("Transform", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (pos && render && render.shape !== "particle") {
        this.drawEntity(entity, pos, render, world);
      }
    });

    this.drawParticles(world);

    canvas.restore();

    this.postRenderHooks.forEach(hook => hook(canvas, world));
  }

  public drawEntity(entity: Entity, pos: TransformComponent, render: RenderComponent, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    canvas.save();
    canvas.translate(pos.worldX ?? pos.x, pos.worldY ?? pos.y);
    canvas.rotate((render.rotation * 180) / Math.PI, 0, 0);

    const drawer = this.shapeDrawers.get(render.shape);
    if (drawer) {
        drawer(canvas, entity, world, render, this.paint);
    }

    canvas.restore();

    const postDrawer = this.postEntityDrawers.get(render.shape);
    if (postDrawer) {
        postDrawer(canvas, entity, world, render, this.paint);
    }
  }

  public registerShape(name: string, drawer: any): void {
    this.shapeDrawers.set(name, drawer);
  }

  public drawParticles(world: World): void {
    // Basic implementation for now to satisfy call in render()
  }
}

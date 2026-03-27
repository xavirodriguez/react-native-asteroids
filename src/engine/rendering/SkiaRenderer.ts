import { Skia, SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent } from "../types/EngineTypes";

export type SkiaShapeDrawer = (
  canvas: SkCanvas,
  paint: SkPaint,
  render: RenderComponent,
  world: World,
  entity: Entity
) => void;

export type SkiaRenderEffect = (
  canvas: SkCanvas,
  paint: SkPaint,
  world: World,
  width: number,
  height: number
) => void;

/**
 * Procedural Skia Renderer implementation.
 * Refactored to use a shape registry and effect hooks for extensibility.
 */
export class SkiaRenderer implements Renderer {
  private canvas: SkCanvas | null = null;
  private width: number = 0;
  private height: number = 0;
  private paint: SkPaint;
  private shapeRegistry: Map<string, SkiaShapeDrawer> = new Map();
  private backgroundEffects: SkiaRenderEffect[] = [];
  private foregroundEffects: SkiaRenderEffect[] = [];

  constructor(canvas?: SkCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.paint = Skia.Paint();
    this.registerDefaultShapes();
  }

  private registerDefaultShapes(): void {
    this.registerShape("circle", (canvas, paint, render) => {
      paint.setColor(Skia.Color(render.color));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, 0, render.size, paint);
    });

    this.registerShape("polygon", (canvas, paint, render) => {
      if (!render.vertices || render.vertices.length === 0) {
        paint.setColor(Skia.Color(render.color));
        paint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawCircle(0, 0, render.size, paint);
        return;
      }

      const path = Skia.Path.Make();
      path.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
        path.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      path.close();

      const isHitFlash = render.hitFlashFrames && render.hitFlashFrames > 0;
      paint.setColor(isHitFlash ? Skia.Color("rgba(255, 255, 255, 0.5)") : Skia.Color("#333"));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(path, paint);

      paint.setColor(isHitFlash ? Skia.Color("white") : Skia.Color(render.color));
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      canvas.drawPath(path, paint);
    });

    this.registerShape("line", (canvas, paint, render) => {
      paint.setColor(Skia.Color(render.color));
      paint.setStrokeWidth(2);
      canvas.drawLine(-render.size / 2, 0, render.size / 2, 0, paint);
    });
  }

  public registerShape(name: string, drawer: SkiaShapeDrawer): void {
    this.shapeRegistry.set(name, drawer);
  }

  public registerBackgroundEffect(effect: SkiaRenderEffect): void {
    this.backgroundEffects.push(effect);
  }

  public registerForegroundEffect(effect: SkiaRenderEffect): void {
    this.foregroundEffects.push(effect);
  }

  public setCanvas(canvas: SkCanvas): void {
    this.canvas = canvas;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public registerShape(name: string, drawer: ShapeDrawer<SkCanvas>): void {
    this.shapeRegistry.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<SkCanvas>): void {
    this.backgroundEffects.set(name, drawer);
  }

  public registerForegroundEffect(name: string, drawer: EffectDrawer<SkCanvas>): void {
    this.foregroundEffects.set(name, drawer);
  }

  public clear(): void {
    if (!this.canvas || typeof Skia === "undefined") return;
    this.canvas.clear(Skia.Color("black"));
  }

  public render(world: World): void {
    if (!this.canvas || typeof Skia === "undefined") return;
    const canvas = this.canvas;

    this.clear();

    this.backgroundEffects.forEach(effect => effect(canvas, this.paint, world, this.width, this.height));

    canvas.save();

    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const components: Record<string, any> = {
        Position: world.getComponent(entity, "Position"),
        Render: world.getComponent(entity, "Render"),
        Health: world.getComponent(entity, "Health"),
        Input: world.getComponent(entity, "Input"),
        Ship: world.getComponent(entity, "Ship"),
      };
      const render = components.Render;
      if (render && render.shape !== "particle") {
        this.drawEntity(entity, components, world);
      }
    });

    this.drawParticles(world);

    // Foreground Effects
    canvas.save();
    this.foregroundEffects.forEach((drawer) => drawer(canvas, world, this.width, this.height));
    canvas.restore();

    this.foregroundEffects.forEach(effect => effect(canvas, this.paint, world, this.width, this.height));
  }

  public drawEntity(entity: Entity, components: Record<string, any>, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;
    const pos = components["Position"] as PositionComponent;
    const render = components["Render"] as RenderComponent;

    if (!pos || !render) return;

    canvas.save();
    canvas.translate(pos.x, pos.y);
    canvas.rotate((render.rotation * 180) / Math.PI, 0, 0);

    const drawer = this.shapeRegistry.get(render.shape);
    if (drawer) {
      drawer(canvas, this.paint, render, world, entity);
    }

    canvas.restore();
  }

  public drawParticles(world: World): void {
    if (!this.canvas || typeof Skia === "undefined") return;
    const canvas = this.canvas;
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
        const hueVariation = (entity % 10) - 5;
        const hue = 20 + hueVariation;
        const lightness = 50 + (1 - lifeRatio) * 50;

        this.paint.setColor(Skia.Color(`hsl(${hue}, 100%, ${lightness}%)`));
        this.paint.setAlphaf(lifeRatio);
        this.paint.setStyle(Skia.PaintStyle.Fill);

        const size = render.size * lifeRatio;
        canvas.drawCircle(pos.x, pos.y, size, this.paint);
    });
  }

}

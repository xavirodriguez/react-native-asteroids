import { Skia, SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer, ShapeDrawer, EffectDrawer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent } from "../types/EngineTypes";

/**
 * Procedural Skia Renderer implementation.
 * Generic and extensible via Shape and Effect registries.
 */
export class SkiaRenderer implements Renderer {
  public readonly type = "skia";
  private canvas: SkCanvas | null = null;
  private width: number = 0;
  private height: number = 0;
  private _paint: SkPaint | null = null;

  private shapeRegistry = new Map<string, ShapeDrawer<SkCanvas>>();
  private backgroundEffects = new Map<string, EffectDrawer<SkCanvas>>();
  private foregroundEffects = new Map<string, EffectDrawer<SkCanvas>>();

  constructor(canvas?: SkCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
  }

  /**
   * Lazy-initializes the paint object to avoid "CanvasKit is not defined" on Web.
   */
  private get paint(): SkPaint {
    if (!this._paint) {
      if (typeof Skia === "undefined") {
          throw new Error("Skia is not available. Ensure CanvasKit is loaded on Web.");
      }
      this._paint = Skia.Paint();
    }
    return this._paint;
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

    // Background Effects
    canvas.save();
    this.backgroundEffects.forEach((drawer) => drawer(canvas, world, this.width, this.height));
    canvas.restore();

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
    canvas.save();
    this.foregroundEffects.forEach((drawer) => drawer(canvas, world, this.width, this.height));
    canvas.restore();
  }

  public drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    canvas.save();
    canvas.translate(pos.x, pos.y);
    canvas.rotate((render.rotation * 180) / Math.PI, 0, 0);

    const customDrawer = this.shapeRegistry.get(render.shape);
    if (customDrawer) {
      customDrawer(canvas, entity, pos, render, world);
    } else {
      this.drawPrimitive(canvas, entity, pos, render, world);
    }

    canvas.restore();
  }

  private drawPrimitive(
    canvas: SkCanvas,
    _entity: Entity,
    _pos: PositionComponent,
    render: RenderComponent,
    _world: World
  ): void {
    switch (render.shape) {
      case "polygon":
        if (render.vertices) this.drawPolygon(canvas, render.vertices, render.color, render.hitFlashFrames);
        break;
      case "circle":
        this.drawCircle(canvas, render.size, render.color);
        break;
      case "flash":
        this.drawFlash(canvas, _world, _entity, render.size);
        break;
      case "line":
        this.drawLine(canvas, render.size, render.color);
        break;
    }
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

  private drawCircle(canvas: SkCanvas, size: number, color: string): void {
    this.paint.setColor(Skia.Color(color));
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(0, 0, size, this.paint);
    this.paint.setAlphaf(1.0);
  }

  private drawPolygon(canvas: SkCanvas, vertices: { x: number; y: number }[], color: string, hitFlashFrames?: number): void {
    const path = Skia.Path.Make();
    path.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        path.lineTo(vertices[i].x, vertices[i].y);
    }
    path.close();

    const isHitFlash = hitFlashFrames && hitFlashFrames > 0;
    this.paint.setColor(isHitFlash ? Skia.Color("white") : Skia.Color(color));
    this.paint.setStyle(Skia.PaintStyle.Stroke);
    this.paint.setStrokeWidth(2);
    canvas.drawPath(path, this.paint);
  }

  private drawFlash(canvas: SkCanvas, world: World, entity: Entity, size: number): void {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    const alpha = ttl ? ttl.remaining / ttl.total : 1;
    this.paint.setColor(Skia.Color("white"));
    this.paint.setAlphaf(alpha * 0.5);
    canvas.drawCircle(0, 0, size, this.paint);
    this.paint.setAlphaf(1.0);
  }

  private drawLine(canvas: SkCanvas, size: number, color: string): void {
    this.paint.setColor(Skia.Color(color));
    this.paint.setStrokeWidth(2);
    canvas.drawLine(-size / 2, 0, size / 2, 0, this.paint);
  }
}

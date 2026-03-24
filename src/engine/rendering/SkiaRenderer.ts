import { Skia, SkCanvas, SkPaint, BlurStyle } from "@shopify/react-native-skia";
import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent, HealthComponent } from "../types/EngineTypes";

/**
 * Procedural Skia Renderer implementation.
 * Ported with full visual features (Starfields, CRT, Screen Shake, Thrusters, Particles).
 */
export class SkiaRenderer implements Renderer {
  private canvas: SkCanvas | null = null;
  private width: number = 0;
  private height: number = 0;
  private paint: SkPaint;

  constructor(canvas?: SkCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.paint = Skia.Paint();
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

    // Improvement 4: Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
      shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
    }

    canvas.save();
    canvas.translate(shakeX, shakeY);

    // Improvement 3: Starfield
    if (gameState?.stars) {
        this.drawStarField(canvas, gameState.stars, world);
    }

    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (pos && render && render.shape !== "particle") {
        this.drawEntity(entity, pos, render, world);
      }
    });

    this.drawParticles(world);

    canvas.restore();
  }

  public drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    canvas.save();
    canvas.translate(pos.x, pos.y);
    canvas.rotate((render.rotation * 180) / Math.PI, 0, 0);

    const isInvulnerable = this.checkInvulnerability(world, entity);
    const blinkOpacity = isInvulnerable
        ? Math.floor(Date.now() / 150) % 2 === 0 ? 0.3 : 1.0
        : 1.0;

    this.paint.setAlphaf(blinkOpacity);

    switch (render.shape) {
      case "triangle":
        this.drawShip(canvas, world, entity, render.size, render.color);
        break;
      case "circle":
        this.drawCircle(canvas, render.size, render.color, world.hasComponent(entity, "Bullet"));
        break;
      case "polygon":
        if (render.vertices) this.drawPolygon(canvas, render.vertices, render.color, render.internalLines, render.hitFlashFrames);
        break;
      case "ufo":
        this.drawUfo(canvas, render.size, render.color);
        break;
      case "flash":
        this.drawFlash(canvas, world, entity, render.size);
        break;
      case "line":
        this.drawLine(canvas, render.size, render.color);
        break;
    }

    canvas.restore();

    // Improvement 2: Ship trail
    if (world.hasComponent(entity, "Ship") && render.trailPositions) {
        this.drawShipTrail(canvas, render.trailPositions, render.size);
    }
  }

  public drawParticles(world: World): void {
    if (!this.canvas) return;
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

  private drawShip(canvas: SkCanvas, world: World, entity: Entity, size: number, color: string): void {
    const input = world.getComponent<any>(entity, "Input");

    if (input?.thrust) {
        const thrusterPath = Skia.Path.Make();
        thrusterPath.moveTo(-5, 3);
        thrusterPath.lineTo(-15, 0);
        thrusterPath.lineTo(-5, -3);
        thrusterPath.close();

        this.paint.setColor(Skia.Color("#FF4400"));
        this.paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 5, true));
        canvas.drawPath(thrusterPath, this.paint);
        this.paint.setMaskFilter(null);
        this.paint.setColor(Skia.Color("#FFCC00"));
        canvas.drawPath(thrusterPath, this.paint);
    }

    const shipPath = Skia.Path.Make();
    shipPath.moveTo(10, 0);
    shipPath.lineTo(-5, 5);
    shipPath.lineTo(-3, 2);
    shipPath.lineTo(-3, -2);
    shipPath.lineTo(-5, -5);
    shipPath.close();

    this.paint.setColor(Skia.Color("#DDDDDD"));
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(shipPath, this.paint);

    this.paint.setColor(Skia.Color(color));
    this.paint.setStyle(Skia.PaintStyle.Stroke);
    this.paint.setStrokeWidth(1);
    canvas.drawPath(shipPath, this.paint);

    // Details
    this.paint.setColor(Skia.Color("#FF0000"));
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-size / 2, size / 6, size / 6, size / 8), this.paint);
    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 6 - size / 8, size / 6, size / 8), this.paint);
  }

  private drawCircle(canvas: SkCanvas, size: number, color: string, isBullet: boolean): void {
    if (isBullet) {
        this.paint.setColor(Skia.Color("#FFFF00"));
        this.paint.setAlphaf(0.3);
        this.paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 4, true));
        canvas.drawCircle(0, 0, size * 3, this.paint);
        this.paint.setMaskFilter(null);
        this.paint.setAlphaf(1.0);
        this.paint.setColor(Skia.Color("#FFFFFF"));
    } else {
        this.paint.setColor(Skia.Color(color));
    }
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(0, 0, size, this.paint);
  }

  private drawPolygon(canvas: SkCanvas, vertices: { x: number; y: number }[], color: string, internalLines?: any[], hitFlashFrames?: number): void {
    const path = Skia.Path.Make();
    path.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        path.lineTo(vertices[i].x, vertices[i].y);
    }
    path.close();

    const isHitFlash = hitFlashFrames && hitFlashFrames > 0;
    this.paint.setColor(isHitFlash ? Skia.Color("rgba(255, 255, 255, 0.5)") : Skia.Color("#333"));
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, this.paint);

    this.paint.setColor(isHitFlash ? Skia.Color("white") : Skia.Color(color));
    this.paint.setStyle(Skia.PaintStyle.Stroke);
    this.paint.setStrokeWidth(2);
    canvas.drawPath(path, this.paint);

    if (internalLines) {
        this.paint.setColor(Skia.Color("#222"));
        this.paint.setStrokeWidth(1);
        internalLines.forEach(line => {
            canvas.drawLine(line.x1, line.y1, line.x2, line.y2, this.paint);
        });
    }
  }

  private drawUfo(canvas: SkCanvas, size: number, color: string): void {
    this.paint.setColor(Skia.Color(color));
    this.paint.setAlphaf(0.3);
    this.paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));
    canvas.drawCircle(0, 0, size, this.paint);
    this.paint.setMaskFilter(null);

    this.paint.setAlphaf(1.0);
    this.paint.setColor(Skia.Color("#999"));
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), this.paint);

    this.paint.setColor(Skia.Color(color));
    this.paint.setStyle(Skia.PaintStyle.Stroke);
    canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), this.paint);

    this.paint.setColor(Skia.Color("#00ffff"));
    this.paint.setAlphaf(0.6);
    this.paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(-size / 2, -size / 2, size, size / 1.5), this.paint);

    this.paint.setColor(Skia.Color("yellow"));
    this.paint.setAlphaf(1.0);
    canvas.drawCircle(-size / 2, 0, 1.5, this.paint);
    canvas.drawCircle(0, size / 6, 1.5, this.paint);
    canvas.drawCircle(size / 2, 0, 1.5, this.paint);
  }

  private drawFlash(canvas: SkCanvas, world: World, entity: Entity, size: number): void {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    const alpha = ttl ? ttl.remaining / ttl.total : 1;
    this.paint.setColor(Skia.Color("white"));
    this.paint.setAlphaf(alpha * 0.5);
    this.paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 20, true));
    canvas.drawCircle(0, 0, size, this.paint);
    this.paint.setMaskFilter(null);
  }

  private drawLine(canvas: SkCanvas, size: number, color: string): void {
    this.paint.setColor(Skia.Color(color));
    this.paint.setStrokeWidth(2);
    canvas.drawLine(-size / 2, 0, size / 2, 0, this.paint);
  }

  private drawShipTrail(canvas: SkCanvas, trail: { x: number; y: number }[], _shipSize: number): void {
    void _shipSize;
    this.paint.setColor(Skia.Color("cyan"));
    this.paint.setStyle(Skia.PaintStyle.Fill);
    trail.forEach((p, i) => {
        this.paint.setAlphaf((i / trail.length) * 0.4);
        canvas.drawCircle(p.x, p.y, 1.5, this.paint);
    });
  }

  private drawStarField(canvas: SkCanvas, stars: any[], world: World): void {
    const shipEntity = world.query("Ship", "Position")[0];
    const shipPos = shipEntity
      ? world.getComponent<PositionComponent>(shipEntity, "Position")
      : { x: this.width / 2, y: this.height / 2 };

    if (!shipPos) return;

    this.paint.setColor(Skia.Color("white"));
    this.paint.setStyle(Skia.PaintStyle.Fill);

    stars.forEach(star => {
      const parallaxX = (star.x - shipPos.x * (0.05 * (star.layer + 1)) + this.width) % this.width;
      const parallaxY = (star.y - shipPos.y * (0.05 * (star.layer + 1)) + this.height) % this.height;

      const twinkle = 0.8 + Math.sin(star.twinklePhase + Date.now() * 0.005 * star.twinkleSpeed) * 0.2;
      this.paint.setAlphaf(star.brightness * twinkle);
      canvas.drawRect(Skia.XYWHRect(parallaxX, parallaxY, star.size, star.size), this.paint);
    });
  }

  private checkInvulnerability(world: World, entity: Entity): boolean {
    const health = world.getComponent<HealthComponent>(entity, "Health");
    return !!health && health.invulnerableRemaining > 0;
  }
}

import { Skia, BlurStyle, SkCanvas, SkPaint, PaintStyle } from "@shopify/react-native-skia";
import { World } from "../../../engine/core/World";
import { Entity } from "../../../engine/core/Entity";
import { TransformComponent, RenderComponent, TTLComponent, HealthComponent, Star } from "../../../engine/core/CoreComponents";
import { InputComponent, GameStateComponent, ShipComponent } from "../types/AsteroidTypes";

export const drawSkiaShip = (canvas: SkCanvas, entity: Entity, world: World, render: RenderComponent, paint: SkPaint) => {
    const size = render.size;
    const input = world.getComponent<InputComponent>(entity, "Input");
    const health = world.getComponent<HealthComponent>(entity, "Health");

    const isInvulnerable = health && health.invulnerableRemaining > 0;
      const gameState = world.getSingleton<GameStateComponent>("GameState");
      const tick = gameState?.serverTick ?? 0;
    const blinkOpacity = isInvulnerable
        ? Math.floor(tick / 10) % 2 === 0 ? 0.3 : 1.0
        : 1.0;

    paint.setAlphaf(blinkOpacity);

    if (input?.thrust) {
        const thrusterPath = Skia.Path.Make();
        thrusterPath.moveTo(-5, 3);
        thrusterPath.lineTo(-15, 0);
        thrusterPath.lineTo(-5, -3);
        thrusterPath.close();

        paint.setColor(Skia.Color("#FF4400"));
        paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 5, true));
        canvas.drawPath(thrusterPath, paint);
        paint.setMaskFilter(null);
        paint.setColor(Skia.Color("#FFCC00"));
        canvas.drawPath(thrusterPath, paint);
    }

    const shipPath = Skia.Path.Make();
    shipPath.moveTo(10, 0);
    shipPath.lineTo(-5, 5);
    shipPath.lineTo(-3, 2);
    shipPath.lineTo(-3, -2);
    shipPath.lineTo(-5, -5);
    shipPath.close();

    paint.setColor(Skia.Color("#DDDDDD"));
    paint.setStyle(PaintStyle.Fill);
    canvas.drawPath(shipPath, paint);

    paint.setColor(Skia.Color(render.color));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(1);
    canvas.drawPath(shipPath, paint);

    // Details
    paint.setColor(Skia.Color("#FF0000"));
    paint.setStyle(PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-size / 2, size / 6, size / 6, size / 8), paint);
    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 6 - size / 8, size / 6, size / 8), paint);
};

export const drawSkiaAsteroidShipTrailDrawer = (canvas: SkCanvas, entity: Entity, world: World, _render: RenderComponent, paint: SkPaint) => {
    const shipComp = world.getComponent<ShipComponent>(entity, "Ship");
    if (shipComp && shipComp.trailPositions) {
        drawSkiaAsteroidShipTrail(canvas, shipComp.trailPositions, paint);
    }
};

export const drawSkiaUfo = (canvas: SkCanvas, entity: Entity, world: World, render: RenderComponent, paint: SkPaint) => {
    const size = render.size;
    const color = render.color;

    paint.setColor(Skia.Color(color));
    paint.setAlphaf(0.3);
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));
    canvas.drawCircle(0, 0, size, paint);
    paint.setMaskFilter(null);

    paint.setAlphaf(1.0);
    paint.setColor(Skia.Color("#999"));
    paint.setStyle(PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), paint);

    paint.setColor(Skia.Color(color));
    paint.setStyle(PaintStyle.Stroke);
    canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), paint);

    paint.setColor(Skia.Color("#00ffff"));
    paint.setAlphaf(0.6);
    paint.setStyle(PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(-size / 2, -size / 2, size, size / 1.5), paint);

    paint.setColor(Skia.Color("yellow"));
    paint.setAlphaf(1.0);
    canvas.drawCircle(-size / 2, 0, 1.5, paint);
    canvas.drawCircle(0, size / 6, 1.5, paint);
    canvas.drawCircle(size / 2, 0, 1.5, paint);
};

export const drawSkiaFlash = (canvas: SkCanvas, entity: Entity, world: World, render: RenderComponent, paint: SkPaint) => {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    const alpha = ttl ? ttl.remaining / ttl.total : 1;
    const size = render.size;
    paint.setColor(Skia.Color("white"));
    paint.setAlphaf(alpha * 0.5);
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 20, true));
    canvas.drawCircle(0, 0, size, paint);
    paint.setMaskFilter(null);
};

export function drawSkiaAsteroidStarField(canvas: SkCanvas, stars: Star[], width: number, height: number, world: World, paint: SkPaint): void {
    const shipEntity = world.query("Ship", "Transform")[0];
    const shipPos = shipEntity
      ? world.getComponent<TransformComponent>(shipEntity, "Transform")
      : { x: width / 2, y: height / 2 } as TransformComponent;

    if (!shipPos) return;

    paint.setColor(Skia.Color("white"));
    paint.setStyle(PaintStyle.Fill);

    stars.forEach(star => {
      const parallaxX = (star.x - (shipPos.worldX ?? shipPos.x) * (0.05 * (star.layer + 1)) + width) % width;
      const parallaxY = (star.y - (shipPos.worldY ?? shipPos.y) * (0.05 * (star.layer + 1)) + height) % height;

      const gameState = world.getSingleton<GameStateComponent>("GameState");
      const tick = gameState?.serverTick ?? 0;
      const twinkle = 0.8 + Math.sin(star.twinklePhase + tick * 0.1 * star.twinkleSpeed) * 0.2;
      paint.setAlphaf(star.brightness * twinkle);
      canvas.drawRect(Skia.XYWHRect(parallaxX, parallaxY, star.size, star.size), paint);
    });
}

export function drawSkiaAsteroidShipTrail(canvas: SkCanvas, trail: { x: number; y: number }[], paint: SkPaint): void {
    paint.setColor(Skia.Color("cyan"));
    paint.setStyle(PaintStyle.Fill);
    trail.forEach((p, i) => {
        paint.setAlphaf((i / trail.length) * 0.4);
        canvas.drawCircle(p.x, p.y, 1.5, paint);
    });
}

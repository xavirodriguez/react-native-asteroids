import { ShapeDrawer, EffectDrawer } from "../../../engine/rendering/Renderer";
import { TransformComponent, HealthComponent, TTLComponent } from "../../../engine/types/EngineTypes";
import { Platform } from "react-native";
import { RandomService } from "../../../engine/utils/RandomService";

// Lazy initialize paint to avoid issues in environments where Skia is not fully ready at module load time
let paint: any = null;
const getPaint = () => {
    if (Platform.OS === "web") return null;
    try {
        const { Skia } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (!paint && typeof Skia !== "undefined") {
            paint = Skia.Paint();
        }
    } catch (_e) {
        // Skia not available
    }
    return paint;
};

export const drawSkiaShip: ShapeDrawer<any> = (canvas, entity, _pos, render, world) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia, BlurStyle } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined" || !Skia.Path || !Skia.Paint) return;
        const p = getPaint();
        if (!p) return;
        const size = render.size;
        const input = world.getComponent<any>(entity, "Input");
        const health = world.getComponent<HealthComponent>(entity, "Health");

        const isInvulnerable = health && health.invulnerableRemaining > 0;
        const blinkOpacity = isInvulnerable
            ? Math.floor(Date.now() / 150) % 2 === 0 ? 0.3 : 1.0
            : 1.0;

        p.setAlphaf(blinkOpacity);

        if (input?.thrust) {
            const thrusterPath = Skia.Path.Make();
            thrusterPath.moveTo(-5, 3);
            thrusterPath.lineTo(-15, 0);
            thrusterPath.lineTo(-5, -3);
            thrusterPath.close();

            p.setColor(Skia.Color("#FF4400"));
            if (Skia.MaskFilter) {
                p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 5, true));
            }
            canvas.drawPath(thrusterPath, p);
            p.setMaskFilter(null);
            p.setColor(Skia.Color("#FFCC00"));
            canvas.drawPath(thrusterPath, p);
        }

        const shipPath = Skia.Path.Make();
        shipPath.moveTo(10, 0);
        shipPath.lineTo(-5, 5);
        shipPath.lineTo(-3, 2);
        shipPath.lineTo(-3, -2);
        shipPath.lineTo(-5, -5);
        shipPath.close();

        p.setColor(Skia.Color("#DDDDDD"));
        p.setStyle(Skia.PaintStyle.Fill);
        canvas.drawPath(shipPath, p);

        p.setColor(Skia.Color(render.color));
        p.setStyle(Skia.PaintStyle.Stroke);
        p.setStrokeWidth(1);
        canvas.drawPath(shipPath, p);

        // Details
        p.setColor(Skia.Color("#FF0000"));
        p.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(-size / 2, size / 6, size / 6, size / 8), p);
        canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 6 - size / 8, size / 6, size / 8), p);
    } catch (_e) {
        // Skia not available or failed to load
    }
};

export const drawSkiaUfo: ShapeDrawer<any> = (canvas, _entity, _pos, render) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia, BlurStyle } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined" || !Skia.Paint) return;
        const p = getPaint();
        if (!p) return;
        const size = render.size;
        const color = render.color;
        p.setColor(Skia.Color(color));
        p.setAlphaf(0.3);
        if (Skia.MaskFilter) {
            p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));
        }
        canvas.drawCircle(0, 0, size, p);
        p.setMaskFilter(null);

        p.setAlphaf(1.0);
        p.setColor(Skia.Color("#999"));
        p.setStyle(Skia.PaintStyle.Fill);
        canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), p);

        p.setColor(Skia.Color(color));
        p.setStyle(Skia.PaintStyle.Stroke);
        canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), p);

        p.setColor(Skia.Color("#00ffff"));
        p.setAlphaf(0.6);
        p.setStyle(Skia.PaintStyle.Fill);
        canvas.drawOval(Skia.XYWHRect(-size / 2, -size / 2, size, size / 1.5), p);

        p.setColor(Skia.Color("yellow"));
        p.setAlphaf(1.0);
        canvas.drawCircle(-size / 2, 0, 1.5, p);
        canvas.drawCircle(0, size / 6, 1.5, p);
        canvas.drawCircle(size / 2, 0, 1.5, p);
    } catch (_e) { /* ignore */ }
};

export const skiaStarfieldEffect: EffectDrawer<any> = (canvas, world, width, height) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined" || !Skia.Paint) return;
        const p = getPaint();
        if (!p) return;
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? world.getComponent<any>(gameStateEntity, "GameState") : null;

        if (gameState?.stars) {
            const shipEntity = world.query("Ship", "Transform")[0];
            const shipPos = shipEntity
              ? world.getComponent<TransformComponent>(shipEntity, "Transform")
              : { x: width / 2, y: height / 2 };

            if (!shipPos) return;

            p.setColor(Skia.Color("white"));
            p.setStyle(Skia.PaintStyle.Fill);

            gameState.stars.forEach((star: any) => {
              const parallaxX = (star.x - shipPos.x * (0.05 * (star.layer + 1)) + width) % width;
              const parallaxY = (star.y - shipPos.y * (0.05 * (star.layer + 1)) + height) % height;

              const twinkle = 0.8 + Math.sin(star.twinklePhase + Date.now() * 0.005 * star.twinkleSpeed) * 0.2;
              p.setAlphaf(star.brightness * twinkle);
              canvas.drawRect(Skia.XYWHRect(parallaxX, parallaxY, star.size, star.size), p);
            });
        }
    } catch (_e) { /* ignore */ }
};

export const skiaScreenShakeEffect: EffectDrawer<any> = (canvas, world) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined") return;
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? world.getComponent<any>(gameStateEntity, "GameState") : null;

        if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      const renderRandom = RandomService.getInstance("render");
      const shakeX = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
      const shakeY = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
          canvas.translate(shakeX, shakeY);
        }
    } catch (_e) { /* ignore */ }
};

export const drawSkiaParticle: ShapeDrawer<any> = (canvas, entity, _pos, render, world) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined" || !Skia.Paint) return;
        const p = getPaint();
        if (!p) return;

        const ttl = world.getComponent<TTLComponent>(entity, "TTL");
        if (!ttl) return;

        const lifeRatio = ttl.remaining / ttl.total;
        const hueVariation = (entity % 10) - 5;
        const hue = 20 + hueVariation;
        const lightness = 50 + (1 - lifeRatio) * 50;

        p.setColor(Skia.Color(`hsl(${hue}, 100%, ${lightness}%)`));
        p.setAlphaf(lifeRatio);
        p.setStyle(Skia.PaintStyle.Fill);

        const size = render.size * lifeRatio;
        canvas.drawCircle(0, 0, size, p);
    } catch (_e) { /* ignore */ }
};

export const drawSkiaBullet: ShapeDrawer<any> = (canvas, _entity, _pos, render) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia, BlurStyle } =  // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined" || !Skia.Paint) return;
        const p = getPaint();
        if (!p) return;
        const size = render.size;

        canvas.save();
        p.setColor(Skia.Color("#FFFF00"));
        p.setAlphaf(0.3);
        if (Skia.MaskFilter) {
            p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 4, true));
        }
        canvas.drawCircle(0, 0, size * 3, p);
        p.setMaskFilter(null);
        p.setAlphaf(1.0);
        p.setColor(Skia.Color("#FFFFFF"));
        p.setStyle(Skia.PaintStyle.Fill);
        canvas.drawCircle(0, 0, size, p);
        canvas.restore();
    } catch (_e) { /* ignore */ }
};

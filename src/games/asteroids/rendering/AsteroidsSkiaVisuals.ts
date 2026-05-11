import { EffectDrawer } from "../../../engine/rendering/Renderer";
import { TransformComponent, HealthComponent, TTLComponent, Star } from "../../../engine/types/EngineTypes";
import { Platform } from "react-native";
import { RandomService } from "../../../engine/utils/RandomService";
import { InputComponent, GameStateComponent } from "../types/AsteroidTypes";
import type { SkCanvas } from "@shopify/react-native-skia";

/**
 * Factory for creating Skia drawers that encapsulate their own paint state.
 * This avoids module-level mutable singletons while preserving performance.
 */
export const createSkiaShipSpriteDrawer = () => {
    let paint: import("@shopify/react-native-skia").SkPaint | null = null;
    let shipImage: import("@shopify/react-native-skia").SkImage | null = null;
    let isLoading = false;

    return (canvas: SkCanvas, entity: import("../../../engine/core/Entity").Entity, _pos: any, elapsedTime: number, render: any, world: import("../../../engine/core/World").World) => {
        if (Platform.OS === "web") return;
        try {
            const { Skia, BlurStyle } = require("@shopify/react-native-skia");
            if (typeof Skia === "undefined" || !Skia.Path || !Skia.Paint) return;
            if (!paint) paint = Skia.Paint();
            const p = paint!;

            const size = render.size;
            const input = world.getComponent<InputComponent>(entity, "Input");
            const health = world.getComponent<HealthComponent>(entity, "Health");

            // Invulnerability blink
            let blinkOpacity = 1.0;
            if (health && health.invulnerableRemaining > 0) {
                blinkOpacity = Math.floor(health.invulnerableRemaining / 150) % 2 === 0 ? 0.3 : 1.0;
            }

            // Hit flash
            if (render.hitFlashFrames && render.hitFlashFrames > 0) {
                if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) blinkOpacity = 0.3;
            }

            p.setAlphaf(blinkOpacity);

            // Load sprite if not loaded
            if (!shipImage && !isLoading) {
                isLoading = true;
                try {
                    const { Image } = require("react-native");
                    // Path relative to this file: src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts
                    // assets/ship.png is in root/assets/ship.png
                    // Going up: rendering -> asteroids -> games -> src -> root
                    const asset = require("../../../../assets/ship.png");
                    const source = Image.resolveAssetSource(asset);
                    if (source && source.uri) {
                        Skia.Data.fromURI(source.uri).then((data: any) => {
                            if (data) {
                                const img = Skia.Image.MakeImageFromEncoded(data);
                                if (img) shipImage = img;
                            }
                        }).catch(() => {
                            isLoading = false;
                        });
                    }
                } catch (e) {
                    console.error("Failed to load ship sprite for Skia:", e);
                }
            }

            if (shipImage) {
                // Apply rotation correction (+90 deg) because sprite points UP
                canvas.save();
                canvas.rotate(90, 0, 0); // Skia rotate uses degrees

                // Thrust Propulsion Flame (inside rotation block)
                if (input?.thrust) {
                    const renderRandom = RandomService.getInstance("render");
                    // Ship points at X+, Rear is at X-
                    const flameStart = -size * 0.8;
                    const flameLen = -size * (1.5 + renderRandom.next() * 0.5);

                    const thrusterPath = Skia.Path.Make();
                    thrusterPath.moveTo(flameStart, size / 3);
                    thrusterPath.lineTo(flameLen, 0);
                    thrusterPath.lineTo(flameStart, -size / 3);
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

                canvas.drawImageRect(
                    shipImage,
                    Skia.XYWHRect(0, 0, shipImage.width(), shipImage.height()),
                    Skia.XYWHRect(-size, -size, size * 2, size * 2),
                    p
                );
                canvas.restore();
            } else {
                // Fallback while loading - matching sprite orientation (+90 deg offset)
                canvas.save();
                canvas.rotate(90, 0, 0);
                const shipPath = Skia.Path.Make();
                shipPath.moveTo(0, -size);
                shipPath.lineTo(size / 2, size / 2);
                shipPath.lineTo(0, size / 4);
                shipPath.lineTo(-size / 2, size / 2);
                shipPath.close();

                p.setColor(Skia.Color("#DDDDDD"));
                p.setStyle(Skia.PaintStyle.Fill);
                canvas.drawPath(shipPath, p);

                p.setColor(Skia.Color(render.color));
                p.setStyle(Skia.PaintStyle.Stroke);
                p.setStrokeWidth(1);
                canvas.drawPath(shipPath, p);
                canvas.restore();
            }
        } catch (_e) { /* ignore */ }
    };
};

export const createSkiaShipDrawer = () => {
    let paint: import("@shopify/react-native-skia").SkPaint | null = null;
    return (canvas: SkCanvas, entity: import("../../../engine/core/Entity").Entity, _pos: any, elapsedTime: number, render: any, world: import("../../../engine/core/World").World) => {
        if (Platform.OS === "web") return;
        try {
            const { Skia, BlurStyle } = require("@shopify/react-native-skia");
            if (typeof Skia === "undefined" || !Skia.Path || !Skia.Paint) return;
            if (!paint) paint = Skia.Paint();
            const p = paint!;
        const size = render.size;
        const input = world.getComponent<InputComponent>(entity, "Input");
        const health = world.getComponent<HealthComponent>(entity, "Health");

        let blinkOpacity = 1.0;
        if (health && health.invulnerableRemaining > 0) {
            blinkOpacity = Math.floor(health.invulnerableRemaining / 150) % 2 === 0 ? 0.3 : 1.0;
        }

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
};

export const createSkiaUfoDrawer = () => {
    let paint: import("@shopify/react-native-skia").SkPaint | null = null;
    return (canvas: SkCanvas, _entity: import("../../../engine/core/Entity").Entity, _pos: any, _elapsedTime: number, render: any) => {
        if (Platform.OS === "web") return;
        try {
            const { Skia, BlurStyle } = require("@shopify/react-native-skia");
            if (typeof Skia === "undefined" || !Skia.Paint) return;
            if (!paint) paint = Skia.Paint();
            const p = paint!;
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
};

export const createSkiaStarfieldEffect = () => {
    let paint: import("@shopify/react-native-skia").SkPaint | null = null;
    return (canvas: SkCanvas, snapshot: import("../../../engine/rendering/RenderSnapshot").RenderSnapshot, width: number, height: number, world: import("../../../engine/core/World").World) => {
        if (Platform.OS === "web") return;
        try {
            const { Skia } = require("@shopify/react-native-skia");
            if (typeof Skia === "undefined" || !Skia.Paint) return;
            if (!paint) paint = Skia.Paint();
            const p = paint!;
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? world.getComponent<GameStateComponent>(gameStateEntity, "GameState") : null;

        if (gameState?.stars) {
            const shipEntity = world.query("Ship", "Transform")[0];
            const shipPos = shipEntity
              ? world.getComponent<TransformComponent>(shipEntity, "Transform")
              : { x: width / 2, y: height / 2 } as TransformComponent;

            if (!shipPos) return;

            p.setColor(Skia.Color("white"));
            p.setStyle(Skia.PaintStyle.Fill);

            gameState.stars.forEach((star: Star) => {
              const parallaxX = (star.x - (shipPos.worldX ?? shipPos.x) * (0.05 * (star.layer + 1)) + width) % width;
              const parallaxY = (star.y - (shipPos.worldY ?? shipPos.y) * (0.05 * (star.layer + 1)) + height) % height;

              const twinkle = 0.8 + Math.sin(star.twinklePhase + snapshot.elapsedTime * 0.005 * star.twinkleSpeed) * 0.2;
              p.setAlphaf(star.brightness * twinkle);
              canvas.drawRect(Skia.XYWHRect(parallaxX, parallaxY, star.size, star.size), p);
            });
        }
        } catch (_e) { /* ignore */ }
    };
};

export const skiaScreenShakeEffect: EffectDrawer<SkCanvas> = (canvas, _snapshot, _width, _height, world) => {
    if (Platform.OS === "web") return;
    try {
        const { Skia } =
        require("@shopify/react-native-skia");
        if (typeof Skia === "undefined") return;
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? world.getComponent<GameStateComponent>(gameStateEntity, "GameState") : null;

        if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      const renderRandom = RandomService.getInstance("render");
      const shakeX = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
      const shakeY = (renderRandom.next() - 0.5) * gameState.screenShake.intensity;
          canvas.translate(shakeX, shakeY);
        }
    } catch (_e) { /* ignore */ }
};

export const createSkiaParticleDrawer = () => {
    let paint: import("@shopify/react-native-skia").SkPaint | null = null;
    return (canvas: SkCanvas, entity: import("../../../engine/core/Entity").Entity, _pos: any, _elapsedTime: number, render: any, world: import("../../../engine/core/World").World) => {
        if (Platform.OS === "web") return;
        try {
            const { Skia } = require("@shopify/react-native-skia");
            if (typeof Skia === "undefined" || !Skia.Paint) return;
            if (!paint) paint = Skia.Paint();
            const p = paint!;

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
};

export const createSkiaBulletDrawer = () => {
    let paint: import("@shopify/react-native-skia").SkPaint | null = null;
    return (canvas: SkCanvas, _entity: import("../../../engine/core/Entity").Entity, _pos: any, _elapsedTime: number, render: any) => {
        if (Platform.OS === "web") return;
        try {
            const { Skia, BlurStyle } = require("@shopify/react-native-skia");
            if (typeof Skia === "undefined" || !Skia.Paint) return;
            if (!paint) paint = Skia.Paint();
            const p = paint!;
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
};

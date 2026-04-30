import { Renderer } from "../../../engine/rendering/Renderer";
import { drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid } from "./AsteroidsCanvasVisuals";
import { drawShip, drawUfo, drawFlash, drawAsteroidStarField, drawAsteroidCRTEffect, drawAsteroidShipTrailDrawer } from "./AsteroidShapeDrawers";
import { GAME_CONFIG } from "../../../types/GameTypes";

/**
 * Default renderer initialization for Asteroids (Native/Universal).
 */
export function initializeAsteroidsRenderer(renderer: Renderer<unknown>): void {
  if (renderer.type === "canvas") {
    const canvasRenderer = renderer as unknown as import("../../../engine/rendering/CanvasRenderer").CanvasRenderer;

    // Register Asteroids-specific shape drawers
    canvasRenderer.registerShapeDrawer("triangle", drawShip);
    canvasRenderer.registerShapeDrawer("ufo", drawUfo);
    canvasRenderer.registerShapeDrawer("flash", drawFlash);

    // Register post-entity drawers (drawn after ctx.restore())
    canvasRenderer.registerPostEntityDrawer("triangle", drawAsteroidShipTrailDrawer);

    // Register custom hooks for Asteroids
    canvasRenderer.addPreRenderHook((ctx: CanvasRenderingContext2D, snapshot: import("../../../engine/rendering/RenderSnapshot").RenderSnapshot, world: import("../../../engine/core/World").World) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity ? (world.getComponent<Record<string, unknown>>(gameStateEntity, "GameState")) : null;
      if (gameState?.stars) {
        drawAsteroidStarField(ctx, gameState.stars as unknown as import("../../../engine/types/EngineTypes").Star[], GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT, world, snapshot.elapsedTime);
      }
    });

    canvasRenderer.addPostRenderHook((ctx: CanvasRenderingContext2D, _snapshot: unknown, world: import("../../../engine/core/World").World) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity ? (world.getComponent<Record<string, unknown>>(gameStateEntity, "GameState")) : null;
      if (gameState?.debugCRT !== false) {
        drawAsteroidCRTEffect(ctx, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
      }
    });

    renderer.registerShape("bullet_shape", drawAsteroidsBullet as unknown as (ctx: unknown, ...args: unknown[]) => void);
    renderer.registerShape("particle", drawAsteroidsParticle as unknown as (ctx: unknown, ...args: unknown[]) => void);
    renderer.registerShape("polygon", drawAsteroidsAsteroid as unknown as (ctx: unknown, ...args: unknown[]) => void);
    // These might be redundant now but I'll keep them if they are used elsewhere
    // renderer.registerBackgroundEffect("starfield", asteroidsStarfieldEffect);
    // renderer.registerForegroundEffect("crt", asteroidsCRTEffect);
  } else if (renderer.type === "skia") {
    try {
      const { createSkiaAsteroidShipTrailDrawer } = require("./AsteroidSkiaDrawers");
      const { drawSkiaShip, drawSkiaUfo, skiaStarfieldEffect, skiaScreenShakeEffect: _skiaScreenShakeEffect, drawSkiaBullet, drawSkiaParticle } = require("./AsteroidsSkiaVisuals");

      const skiaRenderer = renderer as unknown as import("../../../engine/rendering/SkiaRenderer").SkiaRenderer;

      skiaRenderer.registerShape("triangle", drawSkiaShip);
      skiaRenderer.registerShape("ufo", drawSkiaUfo);
      skiaRenderer.registerPostEntityDrawer("triangle", createSkiaAsteroidShipTrailDrawer());
      skiaRenderer.registerShape("bullet_shape", drawSkiaBullet);
      skiaRenderer.registerShape("particle", drawSkiaParticle);
      renderer.registerBackgroundEffect("starfield", skiaStarfieldEffect);
    } catch (e) {
      console.warn("Failed to load Skia visuals:", e instanceof Error ? e.stack : String(e));
    }
  }
}

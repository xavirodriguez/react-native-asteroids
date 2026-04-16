import { Renderer } from "../../../engine/rendering/Renderer";
import { drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid } from "./AsteroidsCanvasVisuals";
import { drawShip, drawUfo, drawFlash, drawAsteroidStarField, drawAsteroidCRTEffect, drawAsteroidShipTrailDrawer } from "./AsteroidShapeDrawers";
import { GAME_CONFIG } from "../../../types/GameTypes";
import { CanvasRenderer } from "../../../engine/rendering/CanvasRenderer";
import { World } from "../../../engine/core/World";
import { GameStateComponent } from "../types/AsteroidTypes";

/**
 * Default renderer initialization for Asteroids (Native/Universal).
 */
export function initializeAsteroidsRenderer(renderer: Renderer<unknown>): void {
  if (renderer.type === "canvas") {
    const canvasRenderer = renderer as CanvasRenderer;

    // Register Asteroids-specific shape drawers
    canvasRenderer.registerShapeDrawer("triangle", drawShip);
    canvasRenderer.registerShapeDrawer("ufo", drawUfo);
    canvasRenderer.registerShapeDrawer("flash", drawFlash);

    // Register post-entity drawers (drawn after ctx.restore())
    canvasRenderer.registerPostEntityDrawer("triangle", drawAsteroidShipTrailDrawer);

    // Register custom hooks for Asteroids
    canvasRenderer.addPreRenderHook((ctx: CanvasRenderingContext2D, _snapshot, world: World) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState")) : null;
      if (gameState?.stars) {
        drawAsteroidStarField(ctx, gameState.stars, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT, world);
      }
    });

    canvasRenderer.addPostRenderHook((ctx: CanvasRenderingContext2D, _snapshot, world: World) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState")) : null;
      if (gameState?.debugCRT !== false) {
        drawAsteroidCRTEffect(ctx, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
      }
    });

    renderer.registerShape("bullet_shape", drawAsteroidsBullet);
    renderer.registerShape("particle", drawAsteroidsParticle);
    renderer.registerShape("polygon", drawAsteroidsAsteroid);
    // These might be redundant now but I'll keep them if they are used elsewhere
    // renderer.registerBackgroundEffect("starfield", asteroidsStarfieldEffect);
    // renderer.registerForegroundEffect("crt", asteroidsCRTEffect);
  } else if (renderer.type === "skia") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { drawSkiaShip, drawSkiaUfo, skiaStarfieldEffect, skiaScreenShakeEffect, drawSkiaBullet, drawSkiaParticle } = require("./AsteroidsSkiaVisuals");
      renderer.registerShape("triangle", drawSkiaShip);
      renderer.registerShape("ufo", drawSkiaUfo);
      renderer.registerShape("bullet_shape", drawSkiaBullet);
      renderer.registerShape("particle", drawSkiaParticle);
      renderer.registerBackgroundEffect("starfield", skiaStarfieldEffect);
      renderer.registerBackgroundEffect("screenshake", skiaScreenShakeEffect);
    } catch (e) {
      console.warn("Failed to load Skia visuals", e);
    }
  }
}

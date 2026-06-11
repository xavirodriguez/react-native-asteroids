import { Renderer } from "@tiny-aster/core";
import { drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid, drawAsteroidsShipSprite } from "./AsteroidsCanvasVisuals";
import { drawShip, drawUfo, drawFlash, drawAsteroidStarField, drawAsteroidCRTEffect, drawAsteroidShipTrailDrawer } from "./AsteroidShapeDrawers";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { GameStateComponent } from "../types/AsteroidTypes";

/**
 * Default renderer initialization for Asteroids (Native/Universal).
 */
export function initializeAsteroidsRenderer(renderer: Renderer<unknown>): void {
  if (renderer.type === "canvas") {
    const canvasRenderer = renderer as unknown as import("@tiny-aster/core").CanvasRenderer;

    // Register Asteroids-specific shape drawers
    canvasRenderer.registerShapeDrawer("triangle", drawShip);
    canvasRenderer.registerShapeDrawer("ship_sprite", drawAsteroidsShipSprite);
    canvasRenderer.registerShapeDrawer("ufo", drawUfo);
    canvasRenderer.registerShapeDrawer("flash", drawFlash);

    // Register post-entity drawers (drawn after ctx.restore())
    canvasRenderer.registerPostEntityDrawer("triangle", drawAsteroidShipTrailDrawer);
    canvasRenderer.registerPostEntityDrawer("ship_sprite", drawAsteroidShipTrailDrawer);

    // Register custom hooks for Asteroids
    canvasRenderer.addPreRenderHook((ctx: CanvasRenderingContext2D, snapshot: import("@tiny-aster/core").RenderSnapshot, world: import("@tiny-aster/core").World) => {
      const config = world.getResource<AsteroidConfig>("GameConfig");
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState")) : null;
      if (gameState?.stars && config) {
        drawAsteroidStarField(ctx, gameState.stars as unknown as import("@tiny-aster/core").Star[], config.SCREEN_WIDTH, config.SCREEN_HEIGHT, world, snapshot.elapsedTime);
      }
    });

    canvasRenderer.addPostRenderHook((ctx: CanvasRenderingContext2D, _snapshot: unknown, world: import("@tiny-aster/core").World) => {
      const config = world.getResource<AsteroidConfig>("GameConfig");
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState")) : null;
      if (gameState?.debugCRT !== false && config) {
        drawAsteroidCRTEffect(ctx, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
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
      const {
        createSkiaShipDrawer,
        createSkiaShipSpriteDrawer,
        createSkiaUfoDrawer,
        createSkiaStarfieldEffect,
        createSkiaBulletDrawer,
        createSkiaParticleDrawer
      } = require("./AsteroidsSkiaVisuals");

      const skiaRenderer = renderer as unknown as import("@tiny-aster/core").SkiaRenderer;

      // Use factory-based drawers to ensure state isolation
      skiaRenderer.registerShape("triangle", createSkiaShipDrawer());
      skiaRenderer.registerShape("ship_sprite", createSkiaShipSpriteDrawer());
      skiaRenderer.registerShape("ufo", createSkiaUfoDrawer());
      skiaRenderer.registerPostEntityDrawer("triangle", createSkiaAsteroidShipTrailDrawer());
      skiaRenderer.registerPostEntityDrawer("ship_sprite", createSkiaAsteroidShipTrailDrawer());
      skiaRenderer.registerShape("bullet_shape", createSkiaBulletDrawer());
      skiaRenderer.registerShape("particle", createSkiaParticleDrawer());
      renderer.registerBackgroundEffect("starfield", createSkiaStarfieldEffect());
    } catch (e) {
      console.warn("Failed to load Skia visuals:", e instanceof Error ? e.stack : String(e));
    }
  }
}

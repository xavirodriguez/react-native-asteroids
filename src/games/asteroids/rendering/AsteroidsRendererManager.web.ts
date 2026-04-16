import { Renderer } from "../../../engine/rendering/Renderer";
import { drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid } from "./AsteroidsCanvasVisuals";
import { drawShip, drawUfo, drawFlash, drawAsteroidStarField, drawAsteroidCRTEffect, drawAsteroidShipTrailDrawer } from "./AsteroidShapeDrawers";
import { GAME_CONFIG } from "../../../types/GameTypes";
import { CanvasRenderer } from "../../../engine/rendering/CanvasRenderer";
import { World } from "../../../engine/core/World";
import { GameStateComponent } from "../types/AsteroidTypes";

/**
 * Web-specific renderer initialization for Asteroids.
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
  }
}

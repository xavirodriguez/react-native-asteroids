import { Renderer } from "@tiny-aster/core";
import { drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid, drawAsteroidsShipSprite } from "./AsteroidsCanvasVisuals";
import { drawShip, drawUfo, drawFlash, drawAsteroidStarField, drawAsteroidCRTEffect, drawAsteroidShipTrailDrawer } from "./AsteroidShapeDrawers";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { GameStateComponent } from "../types/AsteroidTypes";

/**
 * Web-specific renderer initialization for Asteroids.
 */
export function initializeAsteroidsRenderer(renderer: Renderer): void {
  if (renderer.type === "canvas") {
    const canvasRenderer = renderer as import("@tiny-aster/core").CanvasRenderer;

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

    renderer.registerShape("bullet_shape", drawAsteroidsBullet);
    renderer.registerShape("particle", drawAsteroidsParticle);
    renderer.registerShape("polygon", drawAsteroidsAsteroid);
  }
}

import { Renderer } from "../../../engine/rendering/Renderer";
import { drawAsteroidsShip, drawAsteroidsUfo, asteroidsStarfieldEffect, asteroidsCRTEffect, drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid } from "./AsteroidsCanvasVisuals";

/**
 * Default renderer initialization for Asteroids (Native/Universal).
 */
export function initializeAsteroidsRenderer(renderer: Renderer): void {
  if (renderer.type === "canvas") {
    renderer.registerShape("triangle", drawAsteroidsShip);
    renderer.registerShape("ufo", drawAsteroidsUfo);
    renderer.registerShape("bullet_shape", drawAsteroidsBullet);
    renderer.registerShape("particle", drawAsteroidsParticle);
    renderer.registerShape("polygon", drawAsteroidsAsteroid);
    renderer.registerBackgroundEffect("starfield", asteroidsStarfieldEffect);
    renderer.registerForegroundEffect("crt", asteroidsCRTEffect);
  } else if (renderer.type === "skia") {
    try {
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

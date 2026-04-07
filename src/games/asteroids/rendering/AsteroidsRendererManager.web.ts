import { Renderer } from "../../../engine/rendering/Renderer";
import { drawAsteroidsShip, drawAsteroidsUfo, asteroidsStarfieldEffect, asteroidsCRTEffect, drawAsteroidsBullet, drawAsteroidsParticle, drawAsteroidsAsteroid } from "./AsteroidsCanvasVisuals";

/**
 * Web-specific renderer initialization for Asteroids.
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
  }
}

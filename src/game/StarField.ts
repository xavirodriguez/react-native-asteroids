import { Star } from "../types/GameTypes";

/**
 * Generates a random starfield.
 * @param count Number of stars to generate.
 * @param width Screen width.
 * @param height Screen height.
 * @returns Array of Star objects.
 */
export function generateStarField(count: number, width: number, height: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.7 + 0.3,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.5 + Math.random() * 1.5,
    layer: Math.floor(Math.random() * 3),
  }));
}

/**
 * Draws the starfield with parallax effect based on ship position.
 */
export function drawStarField(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  width: number,
  height: number,
  shipPos: { x: number; y: number } = { x: width / 2, y: height / 2 }
): void {
  stars.forEach((star) => {
    // Parallax effect: deeper layers move slower
    // Improvement 18: Real parallax with 3 layers
    const parallaxFactor = 0.02 * (star.layer + 1);
    const parallaxX = (star.x - shipPos.x * parallaxFactor + width) % width;
    const parallaxY = (star.y - shipPos.y * parallaxFactor + height) % height;

    // Improvement 15: Twinkling effect
    const twinkle = 0.7 + Math.sin(star.twinklePhase + Date.now() * 0.002 * star.twinkleSpeed) * 0.3;

    ctx.globalAlpha = star.brightness * twinkle;
    ctx.fillStyle = "white";
    ctx.fillRect(parallaxX, parallaxY, star.size, star.size);
  });
  ctx.globalAlpha = 1.0;
}

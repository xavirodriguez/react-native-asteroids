import { Star } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";

/**
 * Generates a random starfield.
 * @param count Number of stars to generate.
 * @param width Screen width.
 * @param height Screen height.
 * @returns Array of Star objects.
 */
export function generateStarField(count: number, width: number, height: number): Star[] {
  const renderRandom = RandomService.getInstance("render");
  return Array.from({ length: count }, () => ({
    type: "Star",
    x: RandomService.next() * width,
    y: RandomService.next() * height,
    size: RandomService.next() * 1.5 + 0.5,
    alpha: 1,
    brightness: RandomService.next() * 0.7 + 0.3,
    twinklePhase: 0,
    twinkleSpeed: 0,
    layer: 0,
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
    const parallaxFactor = 0.05 * (star.layer + 1);
    const parallaxX = (star.x - shipPos.x * parallaxFactor + width) % width;
    const parallaxY = (star.y - shipPos.y * parallaxFactor + height) % height;

    const twinkle = 0.8 + Math.sin(star.twinklePhase + Date.now() * 0.005 * star.twinkleSpeed) * 0.2;

    ctx.globalAlpha = star.brightness * twinkle;
    ctx.fillStyle = "white";
    ctx.fillRect(parallaxX, parallaxY, star.size, star.size);
  });
  ctx.globalAlpha = 1.0;
}

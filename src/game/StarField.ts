import { GAME_CONFIG, type Star } from "../types/GameTypes";

/**
 * Improvement 3: Static starfield generation.
 * Generates 150-200 stars with random positions, sizes, and twinkling properties.
 */
export function generateStarField(): Star[] {
  const count = 150 + Math.floor(Math.random() * 50);
  return Array.from({ length: count }, () => ({
    x: Math.random() * GAME_CONFIG.SCREEN_WIDTH,
    y: Math.random() * GAME_CONFIG.SCREEN_HEIGHT,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.7 + 0.3,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.5 + Math.random() * 1.5,
    layer: Math.floor(Math.random() * 3), // Parallax layers
  }));
}

/**
 * Improvement 3: Starfield drawing logic for Canvas 2D.
 * Includes parallax displacement based on a reference point (e.g., ship position).
 */
export function drawStarField(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  shipPos: { x: number; y: number }
): void {
  const time = Date.now() / 1000;

  stars.forEach((star) => {
    const layerSpeed = (star.layer + 1) * 0.05;

    // Parallax displacement
    let x = (star.x - shipPos.x * layerSpeed) % GAME_CONFIG.SCREEN_WIDTH;
    let y = (star.y - shipPos.y * layerSpeed) % GAME_CONFIG.SCREEN_HEIGHT;

    if (x < 0) x += GAME_CONFIG.SCREEN_WIDTH;
    if (y < 0) y += GAME_CONFIG.SCREEN_HEIGHT;

    const twinkle = 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);

    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
    ctx.fillRect(x, y, star.size, star.size);
  });
}

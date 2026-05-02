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
    x: renderRandom.next() * width,
    y: renderRandom.next() * height,
    size: renderRandom.next() * 1.5 + 0.5,
    alpha: 1,
    brightness: renderRandom.next() * 0.7 + 0.3,
    twinklePhase: 0,
    twinkleSpeed: 0,
    layer: 0,
  }));
}

/**
 * Dibuja un campo de estrellas con efecto parallax basado en la posición de la cámara/nave.
 *
 * @remarks
 * Genera una ilusión de profundidad infinita mediante el wrapping de coordenadas y
 * multiplicadores de velocidad por capa.
 *
 * ### Lógica de Parallax:
 * 1. Cada estrella pertenece a una capa (`layer`).
 * 2. Las capas más profundas tienen un `parallaxFactor` menor, moviéndose más lento.
 * 3. Se utiliza el operador módulo (%) para que las estrellas que salen de pantalla
 *    aparezcan por el lado opuesto (coordenadas cíclicas).
 */
export function drawStarField(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  width: number,
  height: number,
  shipPos: { x: number; y: number } = { x: width / 2, y: height / 2 },
  elapsedTime: number = performance.now()
): void {
  stars.forEach((star) => {
    // Parallax effect: deeper layers move slower
    const parallaxFactor = 0.05 * (star.layer + 1);
    const parallaxX = (star.x - shipPos.x * parallaxFactor + width) % width;
    const parallaxY = (star.y - shipPos.y * parallaxFactor + height) % height;

    const twinkle = 0.8 + Math.sin(star.twinklePhase + elapsedTime * 0.005 * star.twinkleSpeed) * 0.2;

    ctx.globalAlpha = star.brightness * twinkle;
    ctx.fillStyle = "white";
    ctx.fillRect(parallaxX, parallaxY, star.size, star.size);
  });
  ctx.globalAlpha = 1.0;
}

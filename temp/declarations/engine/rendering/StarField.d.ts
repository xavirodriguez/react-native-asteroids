import { Star } from "../core/CoreComponents";
/**
 * Generates a random starfield.
 * @param count Number of stars to generate.
 * @param width Screen width.
 * @param height Screen height.
 * @returns Array of Star objects.
 */
export declare function generateStarField(count: number, width: number, height: number): Star[];
/**
 * Draws the starfield with parallax effect based on ship position.
 */
export declare function drawStarField(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, shipPos?: {
    x: number;
    y: number;
}): void;

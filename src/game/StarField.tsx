import React from "react";
import { Rect } from "react-native-svg";
import { type Star, GAME_CONFIG } from "../types/GameTypes";

/**
 * Generates a random starfield.
 *
 * @returns An array of star objects.
 */
export function generateStarField(): Star[] {
  return Array.from({ length: GAME_CONFIG.STAR_COUNT }, () => ({
    x: Math.random() * GAME_CONFIG.SCREEN_WIDTH,
    y: Math.random() * GAME_CONFIG.SCREEN_HEIGHT,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.7 + 0.3,
  }));
}

/**
 * Component for rendering the starry background using react-native-svg.
 */
export const StarField: React.FC<{ stars: Star[] }> = React.memo(({ stars }) => (
  <>
    {stars.map((star, i) => (
      <Rect
        key={i}
        x={star.x}
        y={star.y}
        width={star.size}
        height={star.size}
        fill="white"
        opacity={star.brightness}
      />
    ))}
  </>
));
StarField.displayName = "StarField";

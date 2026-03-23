import React, { useMemo } from "react";
import { Circle, Group } from "@shopify/react-native-skia";
import type { World } from "../src/engine/core/World";
import {
  type PositionComponent,
  GAME_CONFIG,
} from "../src/types/GameTypes";

interface StarfieldProps {
  world: World;
}

/**
 * Renders a 3-layer parallax starfield.
 * Star positions are fixed, but their displacement is calculated based on ship position.
 */
export const Starfield: React.FC<StarfieldProps> = ({ world }) => {
  // Static star generation
  const layers = useMemo(() => {
    const starLayers = [];
    const layerCounts = [100, 60, 30];
    const layerSpeeds = [0.05, 0.1, 0.2];
    const layerSizes = [0.5, 1.0, 1.5];

    for (let i = 0; i < 3; i++) {
      const stars = [];
      for (let j = 0; j < layerCounts[i]; j++) {
        stars.push({
          x: Math.random() * GAME_CONFIG.SCREEN_WIDTH,
          y: Math.random() * GAME_CONFIG.SCREEN_HEIGHT,
          size: Math.random() * layerSizes[i] + 0.2,
          opacity: Math.random() * 0.5 + 0.3,
        });
      }
      starLayers.push({ stars, speed: layerSpeeds[i] });
    }
    return starLayers;
  }, []);

  // Find the ship's position to drive parallax
  const shipPos = useMemo(() => {
    const shipEntities = world.query("Ship", "Position");
    if (shipEntities.length > 0) {
      return world.getComponent<PositionComponent>(shipEntities[0], "Position");
    }
    return { x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y } as PositionComponent;
  }, [world.version]);

  return (
    <Group>
      {layers.map((layer, index) => (
        <Group
          key={index}
          transform={[
            { translateX: -(shipPos?.x ?? 0) * layer.speed },
            { translateY: -(shipPos?.y ?? 0) * layer.speed },
          ]}
        >
          {/* Tile the starfield to ensure coverage during movement */}
          <StarLayer stars={layer.stars} offsetX={0} offsetY={0} />
          <StarLayer stars={layer.stars} offsetX={GAME_CONFIG.SCREEN_WIDTH} offsetY={0} />
          <StarLayer stars={layer.stars} offsetX={-GAME_CONFIG.SCREEN_WIDTH} offsetY={0} />
          <StarLayer stars={layer.stars} offsetX={0} offsetY={GAME_CONFIG.SCREEN_HEIGHT} />
          <StarLayer stars={layer.stars} offsetX={0} offsetY={-GAME_CONFIG.SCREEN_HEIGHT} />
        </Group>
      ))}
    </Group>
  );
};

interface StarLayerProps {
  stars: { x: number; y: number; size: number; opacity: number }[];
  offsetX: number;
  offsetY: number;
}

const StarLayer: React.FC<StarLayerProps> = ({ stars, offsetX, offsetY }) => (
  <Group transform={[{ translateX: offsetX }, { translateY: offsetY }]}>
    {stars.map((star, index) => (
      <Circle
        key={index}
        cx={star.x}
        cy={star.y}
        r={star.size}
        color="white"
        opacity={star.opacity}
      />
    ))}
  </Group>
);

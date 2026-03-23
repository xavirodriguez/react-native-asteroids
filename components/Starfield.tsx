import React, { useMemo } from "react";
import { Circle, Group } from "@shopify/react-native-skia";
import type { World } from "../src/engine/core/World";
import {
  type PositionComponent,
  type GameStateComponent,
  type Star,
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
  const gameStateEntity = world.query("GameState")[0];
  const gameState = gameStateEntity
    ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState") ?? null)
    : null;

  const layers = useMemo(() => {
    if (!gameState?.stars) return [];

    const starLayers = [
      { stars: [] as Star[], speed: 0.05 },
      { stars: [] as Star[], speed: 0.1 },
      { stars: [] as Star[], speed: 0.2 },
    ];

    gameState.stars.forEach((star) => {
      starLayers[star.layer || 0].stars.push(star);
    });

    return starLayers;
  }, [gameState?.stars]);

  // Find the ship's position to drive parallax
  const shipPos = useMemo(() => {
    const shipEntities = world.query("Ship", "Position");
    if (shipEntities.length > 0) {
      return world.getComponent<PositionComponent>(shipEntities[0], "Position");
    }
    return { x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y } as PositionComponent;
  }, [world.version]);

  const time = Date.now() / 1000;

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
          <StarLayer stars={layer.stars} offsetX={0} offsetY={0} time={time} />
          <StarLayer stars={layer.stars} offsetX={GAME_CONFIG.SCREEN_WIDTH} offsetY={0} time={time} />
          <StarLayer stars={layer.stars} offsetX={-GAME_CONFIG.SCREEN_WIDTH} offsetY={0} time={time} />
          <StarLayer stars={layer.stars} offsetX={0} offsetY={GAME_CONFIG.SCREEN_HEIGHT} time={time} />
          <StarLayer stars={layer.stars} offsetX={0} offsetY={-GAME_CONFIG.SCREEN_HEIGHT} time={time} />
        </Group>
      ))}
    </Group>
  );
};

interface StarLayerProps {
  stars: Star[];
  offsetX: number;
  offsetY: number;
  time: number;
}

const StarLayer: React.FC<StarLayerProps> = ({ stars, offsetX, offsetY, time }) => (
  <Group transform={[{ translateX: offsetX }, { translateY: offsetY }]}>
    {stars.map((star, index) => {
      const twinkle = 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
      return (
        <Circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.size}
          color="white"
          opacity={star.brightness * twinkle}
        />
      );
    })}
  </Group>
);

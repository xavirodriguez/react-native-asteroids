import React, { useMemo } from "react";
import { Circle, Group } from "@shopify/react-native-skia";
import type { World } from "../engine/core/World";
import {
  type GameStateComponent,
} from "../types/GameTypes";

interface StarfieldProps {
  world: World;
}

/**
 * Renders a starry background.
 * Star positions are fixed and drawn with globalAlpha = brightness.
 */
export const Starfield: React.FC<StarfieldProps> = ({ world }) => {
  const gameStateEntity = world.query("GameState")[0];
  const gameState = gameStateEntity
    ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState") ?? null)
    : null;

  const stars = useMemo(() => {
    return gameState?.stars ?? [];
  }, [gameState?.stars]);

  return (
    <Group>
      {stars.map((star, index) => (
        <Circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.size}
          color="white"
          opacity={star.brightness}
        />
      ))}
    </Group>
  );
};

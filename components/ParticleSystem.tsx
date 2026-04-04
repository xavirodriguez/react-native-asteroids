import React, { useMemo } from "react";
import { Circle, Group } from "@shopify/react-native-skia";
import type { World } from "../src/engine/core/World";
import {
  type PositionComponent,
  type RenderComponent,
  type TTLComponent,
} from "../src/types/GameTypes";

interface ParticleSystemProps {
  world: World;
}

/**
 * Renders all particle entities using Skia.
 */
export const ParticleSystem: React.FC<ParticleSystemProps> = ({ world }) => {
  const particles = useMemo(() => {
    return world.query("Position", "Render", "TTL").filter(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      return render?.shape === "particle";
    });
  }, [world.version]);

  return (
    <Group>
      {particles.map((entity: number) => (
        <ParticleItem key={entity} entity={entity} world={world} />
      ))}
    </Group>
  );
};

interface ParticleItemProps {
  entity: number;
  world: World;
}

const ParticleItem: React.FC<ParticleItemProps> = ({ entity, world }) => {
  const pos = world.getComponent<PositionComponent>(entity, "Position");
  const render = world.getComponent<RenderComponent>(entity, "Render");
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");

  if (!pos || !render || !ttl) return null;

  // Improvement 1: Alpha calculation based on TTL
  const alpha = ttl.remaining / ttl.total;

  // Use HSL for orange-red-white gradient
  // hsl(30 + random*20, 100%, 50 + alpha*30%)
  const hue = 30 + (entity % 20);
  const lightness = 50 + alpha * 30;
  const color = `hsl(${hue}, 100%, ${lightness}%)`;

  // Size reduces with time
  const size = render.size * alpha;

  return (
    <Circle
      cx={pos.x}
      cy={pos.y}
      r={size}
      color={color}
      opacity={alpha}
    />
  );
};

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

  // Linear fade and scale based on remaining TTL
  const opacity = Math.min(ttl.remaining / 400, 1.0);
  const scale = Math.min(ttl.remaining / 200, 1.0);

  return (
    <Circle
      cx={pos.x}
      cy={pos.y}
      r={render.size * scale}
      color={render.color}
      opacity={opacity}
    />
  );
};

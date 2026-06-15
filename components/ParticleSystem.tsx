import React, { useMemo } from "react";
import { Circle, Group } from "@shopify/react-native-skia";
import type { World } from "@tiny-aster/core";

interface ParticleSystemProps {
  world: World<any>;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ world }) => {
  const particles = useMemo(() => {
    return world.query("Transform", "Render", "TTL").filter(entity => {
      const render = world.getComponent(entity, "Render") as any;
      return render?.shape === "particle";
    });
  }, [world]);

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
  world: World<any>;
}

const ParticleItem: React.FC<ParticleItemProps> = ({ entity, world }) => {
  const pos = world.getComponent(entity, "Transform") as any;
  const render = world.getComponent(entity, "Render") as any;
  const ttl = world.getComponent(entity, "TTL") as any;

  if (!pos || !render || !ttl) return null;

  const alpha = ttl.remaining / (ttl.total || 1);

  const hue = 30 + (entity % 20);
  const lightness = 50 + alpha * 30;
  const color = `hsl(${hue}, 100%, ${lightness}%)`;

  const size = (render.size || 1) * alpha;

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

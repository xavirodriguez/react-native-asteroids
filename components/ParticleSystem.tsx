import React, { useMemo } from "react";
import { Circle, Group } from "@shopify/react-native-skia";
import { World, CoreComponentRegistry, Entity, RenderComponent, TransformComponent, TTLComponent } from "@tiny-aster/core";

interface ExtendedRenderComponent extends RenderComponent {
  shape?: string;
  size?: number;
}

interface ExtendedTTLComponent extends TTLComponent {
  total?: number;
}

interface ParticleSystemProps {
  world: World<CoreComponentRegistry>;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ world }) => {
  const particles = useMemo(() => {
    return world.query("Transform", "Render", "TTL").filter((entity: Entity) => {
      const render = world.getComponent(entity, "Render") as ExtendedRenderComponent | undefined;
      return render?.shape === "particle";
    });
  }, [world]);

  return (
    <Group>
      {particles.map((entity: Entity) => (
        <ParticleItem key={entity} entity={entity} world={world} />
      ))}
    </Group>
  );
};

interface ParticleItemProps {
  entity: Entity;
  world: World<CoreComponentRegistry>;
}

const ParticleItem: React.FC<ParticleItemProps> = ({ entity, world }) => {
  const pos = world.getComponent(entity, "Transform") as TransformComponent | undefined;
  const render = world.getComponent(entity, "Render") as ExtendedRenderComponent | undefined;
  const ttl = world.getComponent(entity, "TTL") as ExtendedTTLComponent | undefined;

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

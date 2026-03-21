import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Group, Circle, Path, Skia, Line, Rect, RadialGradient, vec, BlurMask, LinearGradient } from "@shopify/react-native-skia";
import type { World } from "../src/game/ecs-world";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
  type HealthComponent,
  type VelocityComponent,
  GAME_CONFIG,
} from "../src/types/GameTypes";
import { ParticleSystem } from "./ParticleSystem";
import { Starfield } from "./Starfield";
import { ASSET_PATHS } from "../constants/AssetPaths";

/**
 * Properties for the {@link GameRenderer} component.
 */
interface GameRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
}

/**
 * Component responsible for rendering the game world using @shopify/react-native-skia.
 */
export const GameRenderer = React.memo(function GameRenderer({ world }: GameRendererProps) {
  const renderables = useMemo(
    () => world.query("Position", "Render"),
    [world.version]
  );

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Starfield world={world} />
        {renderables.map((entity) => (
          <EntityRenderer key={entity} entity={entity} world={world} />
        ))}
        <ParticleSystem world={world} />
      </Canvas>
    </View>
  );
});

interface EntityRendererProps {
  entity: number;
  world: World;
}

/**
 * Component for rendering a single entity.
 */
const EntityRenderer: React.FC<EntityRendererProps> = ({ entity, world }) => {
  const pos = world.getComponent<PositionComponent>(entity, "Position");
  const render = world.getComponent<RenderComponent>(entity, "Render");

  if (!pos || !render || render.shape === "particle") return null;

  switch (render.shape) {
    case "triangle":
      return <ShipRenderer entity={entity} world={world} pos={pos} render={render} />;
    case "circle":
      return <CircleRenderer entity={entity} world={world} pos={pos} render={render} />;
    case "line":
      return <LineRenderer pos={pos} render={render} />;
    default:
      return null;
  }
};

const ShipRenderer: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, world, pos, render }) => {
  const input = world.getComponent<InputComponent>(entity, "Input");
  const health = world.getComponent<HealthComponent>(entity, "Health");
  const isInvulnerable = health ? health.invulnerableRemaining > 0 : false;
  const { size, rotation, color } = render;

  const blinkOpacity = isInvulnerable
    ? Math.floor(Date.now() / 150) % 2 === 0
      ? 0.3
      : 1.0
    : 1.0;

  return (
    <Group
      transform={[
        { translateX: pos.x },
        { translateY: pos.y },
        { rotate: (rotation * 180) / Math.PI }
      ]}
      opacity={blinkOpacity}
    >
      {input?.thrust && (
        <Group>
          <Path path={ASSET_PATHS.THRUSTER} color="#FF4400">
            <BlurMask blur={5} style="normal" />
          </Path>
          <Path path={ASSET_PATHS.THRUSTER} color="#FFCC00" />
        </Group>
      )}
      <Path path={ASSET_PATHS.SHIP} color="#DDDDDD" />
      <Path
        path={ASSET_PATHS.SHIP}
        color={color}
        style="stroke"
        strokeWidth={1}
      />
      {/* Detail: Ship Port Light */}
      <Rect
        x={-size / 2}
        y={size / 6}
        width={size / 6}
        height={size / 8}
        color="#FF0000"
        opacity={0.8}
      />
      {/* Detail: Ship Starboard Light */}
      <Rect
        x={-size / 2}
        y={-size / 6 - size / 8}
        width={size / 6}
        height={size / 8}
        color="#FF0000"
        opacity={0.8}
      />
    </Group>
  );
};

const CircleRenderer: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, world, pos, render }) => {
  const isAsteroid = world.hasComponent(entity, "Asteroid");
  if (isAsteroid) {
    return <AsteroidRenderer entity={entity} pos={pos} render={render} />;
  }
  return <BulletRenderer entity={entity} world={world} pos={pos} render={render} />;
};

const AsteroidRenderer: React.FC<{
  entity: number;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, pos, render }) => {
  const asteroidPath = useMemo(() => {
    const variants = [
      ASSET_PATHS.ASTEROID_1,
      ASSET_PATHS.ASTEROID_2,
      ASSET_PATHS.ASTEROID_3,
      ASSET_PATHS.ASTEROID_4,
    ];
    const path = variants[entity % variants.length].copy();
    const matrix = Skia.Matrix();
    matrix.scale(render.size, render.size);
    path.transform(matrix);
    return path;
  }, [entity, render.size]);

  return (
    <Group transform={[{ translateX: pos.x }, { translateY: pos.y }]}>
      <Path path={asteroidPath} color="#999" />
      <Path
        path={asteroidPath}
        color={render.color}
        style="stroke"
        strokeWidth={2}
      />
    </Group>
  );
};

const BulletRenderer: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, world, pos, render }) => {
  const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
  const trailSegments = 3;
  const trailLength = 10;

  return (
    <Group>
      {/* Trail */}
      {vel && Array.from({ length: trailSegments }).map((_, i) => (
        <Circle
          key={i}
          cx={pos.x - (vel.dx * (i + 1) * 0.01)}
          cy={pos.y - (vel.dy * (i + 1) * 0.01)}
          r={render.size * (1 - (i + 1) / trailSegments)}
          color={render.color}
          opacity={0.6 * (1 - (i + 1) / trailSegments)}
        />
      ))}

      {/* Bullet Glow */}
      <Circle cx={pos.x} cy={pos.y} r={render.size * 3} color="#FFFF00" opacity={0.3}>
        <BlurMask blur={4} style="normal" />
      </Circle>

      <Circle cx={pos.x} cy={pos.y} r={render.size} color="#FFFFFF" />
    </Group>
  );
};

const LineRenderer: React.FC<{
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ pos, render }) => {
  const { size, rotation, color } = render;
  const halfSize = size / 2;

  return (
    <Group
      transform={[
        { translateX: pos.x },
        { translateY: pos.y },
        { rotate: (rotation * 180) / Math.PI }
      ]}
    >
      <Line
        p1={{ x: -halfSize, y: 0 }}
        p2={{ x: halfSize, y: 0 }}
        color={color}
        strokeWidth={2}
      />
    </Group>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  canvas: {
    width: GAME_CONFIG.SCREEN_WIDTH,
    height: GAME_CONFIG.SCREEN_HEIGHT,
    backgroundColor: "black",
  },
});

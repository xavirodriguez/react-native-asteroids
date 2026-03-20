import React, { useMemo, memo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Circle, Line, Rect, G } from "react-native-svg";
import type { World } from "../src/game/ecs-world";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
  type HealthComponent,
  type TTLComponent,
  GAME_CONFIG,
} from "../src/types/GameTypes";

/**
 * Properties for the {@link GameRenderer} component.
 */
interface GameRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
}

/**
 * Component responsible for rendering the game world using react-native-svg.
 *
 * @param props - Component properties.
 * @returns A React functional component.
 */
export const GameRenderer = React.memo(function GameRenderer({ world }: GameRendererProps) {
  const renderables = useMemo(
    () => world.query("Position", "Render"),
    [world.version]
  );

  return (
    <View style={styles.container}>
      <WorldView world={world} renderables={renderables} />
    </View>
  );
});

interface WorldViewProps {
  world: World;
  renderables: number[];
}

const WorldView: React.FC<WorldViewProps> = ({ world, renderables }) => (
  <Svg
    width={GAME_CONFIG.SCREEN_WIDTH}
    height={GAME_CONFIG.SCREEN_HEIGHT}
    viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
    style={styles.svg}
  >
    {renderables.map((entity) => (
      <EntityRenderer key={entity} entity={entity} world={world} />
    ))}
  </Svg>
);

/**
 * Properties for the {@link EntityRenderer} component.
 */
interface EntityRendererProps {
  entity: number;
  world: World;
}

/**
 * Component for rendering a single entity.
 * Note: Not memoized because it needs to pick up in-place mutations of components
 * on every frame.
 */
const EntityRenderer: React.FC<EntityRendererProps> = ({ entity, world }) => {
  const pos = world.getComponent<PositionComponent>(entity, "Position");
  const render = world.getComponent<RenderComponent>(entity, "Render");

  if (!pos || !render) return <></>;

  return renderByShape({ entity, world, pos, render });
};

const renderByShape = (params: {
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { render } = params;
  const rendererMap: Record<
    RenderComponent["shape"],
    (p: typeof params) => React.ReactElement
  > = {
    triangle: renderShip,
    circle: renderCircleShape,
    line: renderLineShape,
    particle: renderParticleShape,
  };

  const renderer = rendererMap[render.shape];
  return renderer ? renderer(params) : <></>;
};

const renderLineShape = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { pos, render } = params;
  return (
    <LineRenderer
      x={pos.x}
      y={pos.y}
      size={render.size}
      rotation={render.rotation}
      color={render.color}
    />
  );
};

const renderShip = (params: {
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { entity, world, pos, render } = params;
  const input = world.getComponent<InputComponent>(entity, "Input");
  const health = world.getComponent<HealthComponent>(entity, "Health");
  const isInvulnerable = health ? health.invulnerableRemaining > 0 : false;
  return (
    <ShipRenderer
      x={pos.x}
      y={pos.y}
      size={render.size}
      rotation={render.rotation}
      color={render.color}
      hasThrust={input?.thrust ?? false}
      isInvulnerable={isInvulnerable}
    />
  );
};

const renderCircleShape = (params: {
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { entity, world, pos, render } = params;
  const isAsteroid = world.hasComponent(entity, "Asteroid");
  return isAsteroid
    ? renderAsteroid({ pos, render })
    : renderBullet({ pos, render });
};

const renderAsteroid = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => (
  <AsteroidRenderer
    x={params.pos.x}
    y={params.pos.y}
    size={params.render.size}
    color={params.render.color}
  />
);

const renderParticleShape = (params: {
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { entity, world, pos, render } = params;
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  return (
    <ParticleRenderer
      x={pos.x}
      y={pos.y}
      size={render.size}
      color={render.color}
      opacity={ttl ? Math.min(ttl.remaining / 500, 0.8) : 0.8}
    />
  );
};

const renderBullet = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => (
  <BulletRenderer
    x={params.pos.x}
    y={params.pos.y}
    size={params.render.size}
    color={params.render.color}
  />
);

/**
 * Specialized renderer for the player ship.
 */
const ShipRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  hasThrust: boolean;
  isInvulnerable: boolean;
}> = ({ x, y, size, rotation, color, hasThrust, isInvulnerable }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  const blinkOpacity = isInvulnerable
    ? Math.floor(Date.now() / 150) % 2 === 0
      ? 0.3
      : 1.0
    : 1.0;

  return (
    <G transform={transform} opacity={blinkOpacity}>
      {hasThrust && <ShipThrusters size={size} />}
      <ShipCore size={size} />
      <ShipBody size={size} color={color} />
      <ShipDetails size={size} />
    </G>
  );
};

const ShipThrusters: React.FC<{ size: number }> = ({ size }) => (
  <Polygon
    points={`${-size / 2},${size / 3} ${-size * 1.5},0 ${-size / 2},${-size / 3}`}
    fill="#FF6600"
    stroke="#FF9900"
    strokeWidth="1"
    opacity="0.8"
  />
);

const ShipCore: React.FC<{ size: number }> = ({ size }) => {
  const time = Date.now() * 0.005;
  const pulse = Math.sin(time) * 0.1 + 1;
  return (
    <Circle
      cx="0"
      cy="0"
      r={(size / 3) * pulse}
      fill="#FFFF00"
      opacity="0.6"
    />
  );
};

const ShipBody: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Polygon
    points={`${size},0 ${-size / 2},${size / 2} ${-size / 4},0 ${-size / 2},${-size / 2}`}
    fill="#DDDDDD"
    stroke={color}
    strokeWidth="1"
  />
);

const ShipDetails: React.FC<{ size: number }> = ({ size }) => (
  <G opacity={0.8}>
    <ShipWindow size={size} />
    <ShipLights size={size} />
  </G>
);

const ShipWindow: React.FC<{ size: number }> = ({ size }) => (
  <Rect
    x={-size / 2}
    y={-size / 4}
    width={size / 8}
    height={size / 2}
    fill="#666666"
  />
);

const ShipLights: React.FC<{ size: number }> = ({ size }) => (
  <>
    <ShipPortLight size={size} />
    <ShipStarboardLight size={size} />
  </>
);

const ShipPortLight: React.FC<{ size: number }> = ({ size }) => (
  <Rect
    x={-size / 2}
    y={size / 6}
    width={size / 6}
    height={size / 8}
    fill="#FF0000"
  />
);

const ShipStarboardLight: React.FC<{ size: number }> = ({ size }) => (
  <Rect
    x={-size / 2}
    y={-size / 6 - size / 8}
    width={size / 6}
    height={size / 8}
    fill="#FF0000"
  />
);

/**
 * Specialized renderer for asteroids.
 */
const AsteroidRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = memo(({ x, y, size, color }) => (
  <Circle
    cx={x}
    cy={y}
    r={size}
    fill="#999"
    stroke={color}
    strokeWidth="2"
  />
));
AsteroidRenderer.displayName = "AsteroidRenderer";

/**
 * Specialized renderer for bullets.
 */
const BulletRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = memo(({ x, y, size, color }) => (
  <Circle
    cx={x}
    cy={y}
    r={size}
    fill={color}
    stroke={color}
    strokeWidth="1"
  />
));
BulletRenderer.displayName = "BulletRenderer";

/**
 * Specialized renderer for particles.
 */
const ParticleRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}> = memo(({ x, y, size, color, opacity }) => (
  <Circle cx={x} cy={y} r={size} fill={color} opacity={opacity} />
));
ParticleRenderer.displayName = "ParticleRenderer";

/**
 * Specialized renderer for line shapes.
 */
const LineRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}> = memo(({ x, y, size, rotation, color }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  return (
    <Line
      x1={-size / 2}
      y1={0}
      x2={size / 2}
      y2={0}
      stroke={color}
      strokeWidth="2"
      transform={transform}
    />
  );
});
LineRenderer.displayName = "LineRenderer";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
  },
  svg: {
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "black",
  },
});

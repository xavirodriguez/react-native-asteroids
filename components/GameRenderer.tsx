import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Circle, Line, Rect, G } from "react-native-svg";
import type { World } from "../src/game/ecs-world";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
  type HealthComponent,
  type TTLComponent,
  type GameStateComponent,
  type Star,
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

  const gameStateEntity = world.query("GameState")[0];
  const gameState = gameStateEntity
    ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState") ?? null)
    : null;

  return (
    <View style={styles.container}>
      <WorldView world={world} renderables={renderables} gameState={gameState} />
    </View>
  );
});
GameRenderer.displayName = "GameRenderer";

interface WorldViewProps {
  world: World;
  renderables: number[];
  gameState: GameStateComponent | null;
}

const WorldView: React.FC<WorldViewProps> = ({ world, renderables, gameState }) => {
  // Improvement 4: Screen shake
  let transform = "";
  if (gameState?.screenShake && gameState.screenShake.duration > 0) {
    const { intensity } = gameState.screenShake;
    const dx = (Math.random() - 0.5) * intensity;
    const dy = (Math.random() - 0.5) * intensity;
    transform = `translate(${dx}, ${dy})`;
  }

  return (
    <Svg
      width={GAME_CONFIG.SCREEN_WIDTH}
      height={GAME_CONFIG.SCREEN_HEIGHT}
      viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
      style={styles.svg}
    >
      <G transform={transform}>
        {/* Improvement 3: Starry Background */}
        {gameState?.stars && <StarBackground stars={gameState.stars} />}

        {renderables.map((entity) => (
          <EntityRenderer key={entity} entity={entity} world={world} />
        ))}
      </G>
    </Svg>
  );
};
WorldView.displayName = "WorldView";

const StarBackground: React.FC<{ stars: Star[] }> = React.memo(({ stars }) => (
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
StarBackground.displayName = "StarBackground";

/**
 * Properties for the {@link EntityRenderer} component.
 */
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

  if (!pos || !render) return <></>;

  return renderByShape({ entity, world, pos, render });
};
EntityRenderer.displayName = "EntityRenderer";

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
    polygon: renderPolygonShape,
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
      trail={render.trailPositions}
    />
  );
};

const renderCircleShape = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { pos, render } = params;
  // Circles are now only for bullets since asteroids are polygons
  return <BulletRenderer x={pos.x} y={pos.y} size={render.size} color={render.color} />;
};

const renderPolygonShape = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => (
  <PolygonRenderer
    x={params.pos.x}
    y={params.pos.y}
    vertices={params.render.vertices || []}
    color={params.render.color}
    rotation={params.render.rotation}
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
      remaining={ttl?.remaining || 0}
      total={ttl?.total || 1}
    />
  );
};

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
  trail?: { x: number; y: number }[];
}> = ({ x, y, size, rotation, color, hasThrust, isInvulnerable, trail }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  const blinkOpacity = isInvulnerable
    ? Math.floor(Date.now() / 150) % 2 === 0
      ? 0.3
      : 1.0
    : 1.0;

  return (
    <>
      {/* Improvement 2: Ship Trail (drawn in world space) */}
      {trail && <ShipTrail trail={trail} />}

      <G transform={transform} opacity={blinkOpacity}>
        {hasThrust && <ShipThrusters size={size} />}
        <ShipCore size={size} />
        <ShipBody size={size} color={color} />
        <ShipDetails size={size} />
      </G>
    </>
  );
};
ShipRenderer.displayName = "ShipRenderer";

const ShipTrail: React.FC<{ trail: { x: number; y: number }[] }> = React.memo(({ trail }) => (
  <>
    {trail.map((p, i) => (
      <Circle
        key={i}
        cx={p.x}
        cy={p.y}
        r={2}
        fill="#00ffff"
        opacity={(i / trail.length) * 0.4}
      />
    ))}
  </>
));
ShipTrail.displayName = "ShipTrail";

const ShipThrusters: React.FC<{ size: number }> = ({ size }) => (
  <Polygon
    points={`${-size / 2},${size / 3} ${-size * 1.5},0 ${-size / 2},${-size / 3}`}
    fill="#FF6600"
    stroke="#FF9900"
    strokeWidth="1"
    opacity="0.8"
  />
);
ShipThrusters.displayName = "ShipThrusters";

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
ShipCore.displayName = "ShipCore";

const ShipBody: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Polygon
    points={`${size},0 ${-size / 2},${size / 2} ${-size / 4},0 ${-size / 2},${-size / 2}`}
    fill="#DDDDDD"
    stroke={color}
    strokeWidth="1"
  />
);
ShipBody.displayName = "ShipBody";

const ShipDetails: React.FC<{ size: number }> = ({ size }) => (
  <G opacity={0.8}>
    <ShipWindow size={size} />
    <ShipLights size={size} />
  </G>
);
ShipDetails.displayName = "ShipDetails";

const ShipWindow: React.FC<{ size: number }> = ({ size }) => (
  <Rect
    x={-size / 2}
    y={-size / 4}
    width={size / 8}
    height={size / 2}
    fill="#666666"
  />
);
ShipWindow.displayName = "ShipWindow";

const ShipLights: React.FC<{ size: number }> = ({ size }) => (
  <>
    <ShipPortLight size={size} />
    <ShipStarboardLight size={size} />
  </>
);
ShipLights.displayName = "ShipLights";

const ShipPortLight: React.FC<{ size: number }> = ({ size }) => (
  <Rect
    x={-size / 2}
    y={size / 6}
    width={size / 6}
    height={size / 8}
    fill="#FF0000"
  />
);
ShipPortLight.displayName = "ShipPortLight";

const ShipStarboardLight: React.FC<{ size: number }> = ({ size }) => (
  <Rect
    x={-size / 2}
    y={-size / 6 - size / 8}
    width={size / 6}
    height={size / 8}
    fill="#FF0000"
  />
);
ShipStarboardLight.displayName = "ShipStarboardLight";

/**
 * Specialized renderer for polygonal shapes (Asteroids).
 */
const PolygonRenderer: React.FC<{
  x: number;
  y: number;
  vertices: { x: number; y: number }[];
  color: string;
  rotation: number;
}> = React.memo(({ x, y, vertices, color, rotation }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  const points = vertices.map(v => `${v.x},${v.y}`).join(" ");

  return (
    <Polygon
      points={points}
      fill="#333"
      stroke={color}
      strokeWidth="2"
      transform={transform}
    />
  );
});
PolygonRenderer.displayName = "PolygonRenderer";

/**
 * Specialized renderer for bullets.
 */
const BulletRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = React.memo(({ x, y, size, color }) => (
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
  remaining: number;
  total: number;
}> = React.memo(({ x, y, size, remaining, total }) => {
  const alpha = remaining / total;
  // Improvement 1: HSL color and alpha
  const fill = `hsl(${30 + Math.random() * 20}, 100%, ${50 + alpha * 30}%)`;

  return <Circle cx={x} cy={y} r={size} fill={fill} opacity={alpha} />;
});
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
}> = React.memo(({ x, y, size, rotation, color }) => {
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

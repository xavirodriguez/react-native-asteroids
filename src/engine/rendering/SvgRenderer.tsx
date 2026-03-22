import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Circle, Line, Rect, G, Ellipse, Polyline } from "react-native-svg";
import { World } from "../core/World";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
  type HealthComponent,
  type TTLComponent,
  type ShipComponent,
  type GameStateComponent,
  GAME_CONFIG,
} from "../../types/GameTypes";

/**
 * Properties for the {@link SvgRenderer} component.
 */
interface SvgRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
}

/**
 * Component responsible for rendering the game world using react-native-svg.
 */
export const SvgRenderer: React.FC<SvgRendererProps> = ({ world }) => {
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
};

interface WorldViewProps {
  world: World;
  renderables: number[];
  gameState: GameStateComponent | null;
}

const WorldView: React.FC<WorldViewProps> = ({ world, renderables, gameState }) => {
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
        {gameState?.stars && <StarBackground stars={gameState.stars} world={world} />}

        {renderables.map((entity) => (
          <EntityRenderer key={entity} entity={entity} world={world} />
        ))}
      </G>
    </Svg>
  );
};

const StarBackground: React.FC<{ stars: any[]; world: World }> = ({ stars, world }) => {
  const time = Date.now() / 1000;

  const shipEntity = world.query("Ship", "Position")[0];
  const shipPos = shipEntity ? world.getComponent<PositionComponent>(shipEntity, "Position") : { x: 0, y: 0 };

  return (
    <>
      {stars.map((star, i) => {
        const layer = star.layer || 0;
        const speed = (layer + 1) * 0.05;

        let x = (star.x - shipPos.x * speed) % GAME_CONFIG.SCREEN_WIDTH;
        let y = (star.y - shipPos.y * speed) % GAME_CONFIG.SCREEN_HEIGHT;
        if (x < 0) x += GAME_CONFIG.SCREEN_WIDTH;
        if (y < 0) y += GAME_CONFIG.SCREEN_HEIGHT;

        const twinkle = star.twinklePhase !== undefined
          ? 0.7 + 0.3 * Math.sin(time * (star.twinkleSpeed || 1) + star.twinklePhase)
          : 1;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={star.size}
            height={star.size}
            fill="white"
            opacity={star.brightness * twinkle}
          />
        );
      })}
    </>
  );
};

interface EntityRendererProps {
  entity: number;
  world: World;
}

const EntityRenderer: React.FC<EntityRendererProps> = ({ entity, world }) => {
  const pos = world.getComponent<PositionComponent>(entity, "Position");
  const render = world.getComponent<RenderComponent>(entity, "Render");

  if (!pos || !render) return <></>;

  const ghosts = calculateGhosts(pos, render.size);
  const motionBlurGhosts = calculateMotionBlur(world, entity, pos, render);

  return (
    <>
      {motionBlurGhosts.map((mbPos, index) => (
        <G key={`mb-${index}`} opacity={0.3 - index * 0.1}>
          {renderByShape({ entity, world, pos: mbPos, render })}
        </G>
      ))}
      {renderByShape({ entity, world, pos, render })}
      {ghosts.map((ghostPos, index) => (
        <G key={`ghost-${index}`} opacity={0.4}>
          {renderByShape({ entity, world, pos: ghostPos, render })}
        </G>
      ))}
    </>
  );
};

const calculateMotionBlur = (world: World, entity: number, pos: PositionComponent, render: RenderComponent) => {
  const vel = world.getComponent<{type: string, dx: number, dy: number}>(entity, "Velocity");
  if (!vel || !render.trailPositions || render.trailPositions.length < 3) return [];

  const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);
  if (speed < 150) return [];

  return render.trailPositions
    .slice(-4, -1)
    .reverse()
    .map((p) => ({ ...pos, x: p.x, y: p.y }));
};

const calculateGhosts = (pos: PositionComponent, size: number) => {
  const ghosts: PositionComponent[] = [];
  const { SCREEN_WIDTH: w, SCREEN_HEIGHT: h } = GAME_CONFIG;
  const margin = size * 2;

  const nearLeft = pos.x < margin;
  const nearRight = pos.x > w - margin;
  const nearTop = pos.y < margin;
  const nearBottom = pos.y > h - margin;

  if (nearLeft) ghosts.push({ ...pos, x: pos.x + w });
  if (nearRight) ghosts.push({ ...pos, x: pos.x - w });
  if (nearTop) ghosts.push({ ...pos, y: pos.y + h });
  if (nearBottom) ghosts.push({ ...pos, y: pos.y - h });

  if (nearLeft && nearTop) ghosts.push({ ...pos, x: pos.x + w, y: pos.y + h });
  if (nearLeft && nearBottom) ghosts.push({ ...pos, x: pos.x + w, y: pos.y - h });
  if (nearRight && nearTop) ghosts.push({ ...pos, x: pos.x - w, y: pos.y + h });
  if (nearRight && nearBottom) ghosts.push({ ...pos, x: pos.x - w, y: pos.y - h });

  return ghosts;
};

const renderByShape = (params: {
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { render } = params;
  const rendererMap: Record<
    string,
    (p: typeof params) => React.ReactElement
  > = {
    triangle: renderShip,
    circle: renderCircleShape,
    polygon: renderPolygonShape,
    line: renderLineShape,
    particle: renderParticleShape,
    flash: renderFlashShape,
    ufo: renderUfoShape,
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

const renderUfoShape = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => (
  <UfoRenderer
    x={params.pos.x}
    y={params.pos.y}
    size={params.render.size}
    color={params.render.color}
  />
);

const renderFlashShape = (params: {
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { entity, world, pos, render } = params;
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  return (
    <FlashRenderer
      x={pos.x}
      y={pos.y}
      size={render.size}
      remaining={ttl?.remaining || 0}
      total={ttl?.total || 1}
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
  const ship = world.getComponent<ShipComponent>(entity, "Ship");
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
      hyperspaceTimer={ship?.hyperspaceTimer}
      trail={render.trailPositions}
    />
  );
};

const renderCircleShape = (params: {
  pos: PositionComponent;
  render: RenderComponent;
}) => {
  const { pos, render } = params;
  return (
    <BulletRenderer
      x={pos.x}
      y={pos.y}
      size={render.size}
      color={render.color}
      trail={render.trailPositions}
    />
  );
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
    internalLines={params.render.internalLines}
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

const ShipRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  hasThrust: boolean;
  isInvulnerable: boolean;
  hyperspaceTimer?: number;
  trail?: { x: number; y: number }[];
}> = ({ x, y, size, rotation, color, hasThrust, isInvulnerable, hyperspaceTimer = 0, trail }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  const hyperspaceOpacity = hyperspaceTimer > 0 ? (500 - hyperspaceTimer) / 500 : 1.0;
  const blinkOpacity = isInvulnerable
    ? Math.floor(Date.now() / 150) % 2 === 0
      ? 0.3
      : 1.0
    : 1.0;

  return (
    <>
      {trail && <ShipTrail trail={trail} />}
      {hyperspaceTimer > 400 && (
        <Circle cx={x} cy={y} r={size * 2} fill="white" opacity="0.8" />
      )}
      <G transform={transform} opacity={blinkOpacity * hyperspaceOpacity}>
        {hasThrust && <ShipThrusters size={size} />}
        <ShipCore size={size} />
        <ShipBody size={size} color={color} />
        <ShipDetails size={size} />
      </G>
    </>
  );
};

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

const PolygonRenderer: React.FC<{
  x: number;
  y: number;
  vertices: { x: number; y: number }[];
  color: string;
  rotation: number;
  internalLines?: { x1: number; y1: number; x2: number; y2: number }[];
}> = React.memo(({ x, y, vertices, color, rotation, internalLines }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  const points = vertices.map((v) => `${v.x},${v.y}`).join(" ");

  return (
    <G transform={transform}>
      <Polygon points={points} fill="#333" stroke={color} strokeWidth="2" />
      {internalLines?.map((line, i) => (
        <Line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#222"
          strokeWidth="1"
        />
      ))}
    </G>
  );
});

const BulletRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  trail?: { x: number; y: number }[];
}> = React.memo(({ x, y, size, color, trail }) => (
  <>
    {trail && trail.length > 1 && (
      <Polyline
        points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#FF8800"
        strokeWidth={size}
        opacity="0.6"
      />
    )}
    <Circle cx={x} cy={y} r={size} fill={color} stroke={color} strokeWidth="1" />
  </>
));

const ParticleRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  remaining: number;
  total: number;
}> = React.memo(({ x, y, size, remaining, total }) => {
  const alpha = remaining / total;
  const fill = `hsl(${30 + Math.random() * 20}, 100%, ${50 + alpha * 30}%)`;
  return <Circle cx={x} cy={y} r={size} fill={fill} opacity={alpha} />;
});

const UfoRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = React.memo(({ x, y, size, color }) => {
  const transform = `translate(${x}, ${y})`;
  return (
    <G transform={transform}>
      <Ellipse cx="0" cy="0" rx={size} ry={size / 2} fill={color} opacity="0.3" />
      <Ellipse cx="0" cy="0" rx={size} ry={size / 2.5} fill="#999" stroke={color} strokeWidth="1" />
      <Ellipse cx="0" cy={-size / 4} rx={size / 2} ry={size / 3} fill="#00ffff" opacity="0.6" />
      <Circle cx={-size / 2} cy={0} r={1.5} fill="yellow" />
      <Circle cx={0} cy={size / 6} r={1.5} fill="yellow" />
      <Circle cx={size / 2} cy={0} r={1.5} fill="yellow" />
    </G>
  );
});

const FlashRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  remaining: number;
  total: number;
}> = React.memo(({ x, y, size, remaining, total }) => {
  const alpha = (remaining / total) * 0.5;
  return <Circle cx={x} cy={y} r={size} fill="white" opacity={alpha} />;
});

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
    <Line x1={-size / 2} y1={0} x2={size / 2} y2={0} stroke={color} strokeWidth="2" transform={transform} />
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: "black" },
  svg: { borderWidth: 1, borderColor: "#1F2937", backgroundColor: "black" },
});

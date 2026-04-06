import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Circle, Line, Rect, G, Ellipse, Polyline, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode, LinearGradient, Stop, RadialGradient, Pattern } from "react-native-svg";
import { World } from "../core/World";
import {
  type TransformComponent,
  type RenderComponent,
  type HealthComponent,
  type TTLComponent,
} from "../types/EngineTypes";

/**
 * Properties for the {@link SvgRenderer} component.
 */
interface SvgRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
  width: number;
  height: number;
  customRenderers?: Record<string, (params: any) => React.ReactElement>;
  backgroundEffects?: React.ReactNode;
  foregroundEffects?: React.ReactNode;
}

/**
 * Component responsible for rendering the game world using react-native-svg.
 * Refactored to be generic and support custom shape renderers.
 */
export const SvgRenderer: React.FC<SvgRendererProps> = ({ world, width, height, customRenderers, backgroundEffects, foregroundEffects }) => {
  const renderables = useMemo(
    () => world.query("Transform", "Render"),
    [world.version]
  );

  return (
    <View style={styles.container}>
      <WorldView
        world={world}
        width={width}
        height={height}
        renderables={renderables}
        customRenderers={customRenderers}
        backgroundEffects={backgroundEffects}
        foregroundEffects={foregroundEffects}
      />
    </View>
  );
};

interface WorldViewProps {
  world: World;
  width: number;
  height: number;
  renderables: number[];
  customRenderers?: Record<string, (params: any) => React.ReactElement>;
  backgroundEffects?: React.ReactNode;
  foregroundEffects?: React.ReactNode;
}

const WorldView: React.FC<WorldViewProps> = ({ world, width, height, renderables, customRenderers, backgroundEffects, foregroundEffects }) => {
  // Generic screen shake detection if GameState exists
  const gameStateEntity = world.query("GameState")[0];
  const gameState = gameStateEntity ? world.getComponent<any>(gameStateEntity, "GameState") : null;

  let transform = "";
  if (gameState?.screenShake && (gameState.screenShake.duration > 0 || gameState.screenShake.framesLeft > 0)) {
    const intensity = gameState.screenShake.intensity || 5;
    const dx = (Math.random() - 0.5) * intensity;
    const dy = (Math.random() - 0.5) * intensity;
    transform = `translate(${dx}, ${dy})`;
  }

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={styles.svg}
    >
      <Defs>
        <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation="3" result="blur" />
          <FeMerge>
            <FeMergeNode in="blur" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
        <LinearGradient id="thrustGradient" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FF6600" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#FFCC00" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="vignette" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="black" stopOpacity="0" />
          <Stop offset="90%" stopColor="black" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="black" stopOpacity="0.4" />
        </RadialGradient>
        <Pattern id="scanlines" x="0" y="0" width="1" height="4" patternUnits="userSpaceOnUse">
          <Line x1="0" y1="0" x2={width} y2="0" stroke="black" strokeWidth="2" opacity="0.2" />
        </Pattern>
      </Defs>
      <G transform={transform}>
        {backgroundEffects}

        {renderables.map((entity) => (
          <EntityRenderer key={entity} entity={entity} world={world} width={width} height={height} customRenderers={customRenderers} />
        ))}
      </G>

      {foregroundEffects}
    </Svg>
  );
};

interface EntityRendererProps {
  entity: number;
  world: World;
  width: number;
  height: number;
  customRenderers?: Record<string, (params: any) => React.ReactElement>;
}

const EntityRenderer: React.FC<EntityRendererProps> = ({ entity, world, width, height, customRenderers }) => {
  const pos = world.getComponent<TransformComponent>(entity, "Transform");
  const render = world.getComponent<RenderComponent>(entity, "Render");

  if (!pos || !render) return <></>;

  const ghosts = calculateGhosts(pos, render.size, width, height);
  const motionBlurGhosts = calculateMotionBlur(world, entity, pos, render);

  return (
    <>
      {motionBlurGhosts.map((mbPos, index) => (
        <G key={`mb-${index}`} opacity={0.3 - index * 0.1}>
          {renderByShape({ entity, world, pos: mbPos, render, customRenderers })}
        </G>
      ))}
      {renderByShape({ entity, world, pos, render, customRenderers })}
      {ghosts.map((ghostPos, index) => (
        <G key={`ghost-${index}`} opacity={0.4}>
          {renderByShape({ entity, world, pos: ghostPos, render, customRenderers })}
        </G>
      ))}
    </>
  );
};

const calculateMotionBlur = (world: World, entity: number, pos: TransformComponent, render: RenderComponent) => {
  const vel = world.getComponent<{type: string, dx: number, dy: number}>(entity, "Velocity");
  if (!vel || !render.trailPositions || render.trailPositions.length < 3) return [];

  const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);
  if (speed < 150) return [];

  return render.trailPositions
    .slice(-4, -1)
    .reverse()
    .map((p) => ({ ...pos, x: p.x, y: p.y } as TransformComponent));
};

const calculateGhosts = (pos: TransformComponent, size: number, w: number, h: number) => {
  const ghosts: TransformComponent[] = [];
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
  pos: TransformComponent;
  render: RenderComponent;
  customRenderers?: Record<string, (params: any) => React.ReactElement>;
}) => {
  const { render, customRenderers } = params;

  if (customRenderers && customRenderers[render.shape]) {
    return customRenderers[render.shape](params);
  }

  const rendererMap: Record<
    string,
    (p: any) => React.ReactElement
  > = {
    circle: renderCircleShape,
    polygon: renderPolygonShape,
    line: renderLineShape,
    particle: renderParticleShape,
  };

  const renderer = rendererMap[render.shape];
  return renderer ? renderer(params) : <></>;
};

const renderLineShape = (params: {
  pos: TransformComponent;
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

const renderCircleShape = (params: {
  pos: TransformComponent;
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
  pos: TransformComponent;
  render: RenderComponent;
}) => (
  <PolygonRenderer
    x={params.pos.x}
    y={params.pos.y}
    vertices={params.render.vertices || []}
    color={params.render.color}
    rotation={params.render.rotation}
    internalLines={(params.render as any).internalLines}
    hitFlashFrames={params.render.hitFlashFrames}
  />
);

const renderParticleShape = (params: {
  entity: number;
  world: World;
  pos: TransformComponent;
  render: RenderComponent;
}) => {
  const { entity, world, pos, render } = params;
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  return (
    <ParticleRenderer
      seed={entity}
      x={pos.x}
      y={pos.y}
      size={render.size}
      remaining={ttl?.remaining || 0}
      total={ttl?.total || 1}
    />
  );
};

const PolygonRenderer: React.FC<{
  x: number;
  y: number;
  vertices: { x: number; y: number }[];
  color: string;
  rotation: number;
  internalLines?: { x1: number; y1: number; x2: number; y2: number }[];
  hitFlashFrames?: number;
}> = React.memo(({ x, y, vertices, color, rotation, internalLines, hitFlashFrames }) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  const points = vertices.map((v) => `${v.x},${v.y}`).join(" ");

  const isFlashing = hitFlashFrames && hitFlashFrames > 0;
  const fillColor = isFlashing ? "rgba(255, 255, 255, 0.5)" : "#333";
  const strokeColor = isFlashing ? "white" : color;

  return (
    <G transform={transform}>
      <Polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth="2" />
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
        opacity={0.6}
      />
    )}
    <Circle cx={x} cy={y} r={size} fill={color} stroke={color} strokeWidth="1" filter="url(#glow)" />
  </>
));

const ParticleRenderer: React.FC<{
  seed: number;
  x: number;
  y: number;
  size: number;
  remaining: number;
  total: number;
}> = React.memo(({ seed, x, y, size, remaining, total }) => {
  const alpha = Math.max(0, Math.min(1, remaining / total));

  // Dynamic color transition (White -> Orange -> Red)
  const variation = (seed * 13) % 20 - 10;
  const hue = 20 + variation;
  const lightness = 50 + (1 - alpha) * 50;

  const fill = `hsl(${hue}, 100%, ${lightness}%)`;
  const currentSize = size * (0.2 + 0.8 * alpha);

  return (
    <Circle
        cx={x}
        cy={y}
        r={currentSize}
        fill={fill}
        opacity={alpha}
        filter={alpha > 0.8 ? "url(#glow)" : undefined}
    />
  );
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

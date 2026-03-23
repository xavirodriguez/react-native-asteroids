import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Group, Circle, Path, Skia, Line, Rect, BlurMask, Oval } from "@shopify/react-native-skia";
import type { World } from "../src/engine/core/World";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
  type HealthComponent,
  type VelocityComponent,
  type GameStateComponent,
  type ShipComponent,
  type TTLComponent,
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
  const shakeTransform = useMemo(() => {
    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      const { intensity } = gameState.screenShake;
      const dx = (Math.random() - 0.5) * intensity;
      const dy = (Math.random() - 0.5) * intensity;
      return [{ translateX: dx }, { translateY: dy }];
    }
    return [];
  }, [gameState?.screenShake]);

  return (
    <Canvas style={styles.canvas}>
      <Group transform={shakeTransform}>
        <Starfield world={world} />
        {renderables.map((entity) => (
          <EntityRenderer key={entity} entity={entity} world={world} />
        ))}
        <ParticleSystem world={world} />
      </Group>
    </Canvas>
  );
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
WorldView.displayName = "WorldView";

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

  const ghosts = calculateGhosts(pos, render.size);
  const motionBlurGhosts = calculateMotionBlur(world, entity, pos, render);

  return (
    <>
      {motionBlurGhosts.map((mbPos, index) => (
        <Group key={`mb-${index}`} opacity={0.3 - index * 0.1}>
          <ShapeSwitch entity={entity} world={world} pos={mbPos} render={render} />
        </Group>
      ))}
      <ShapeSwitch entity={entity} world={world} pos={pos} render={render} />
      {ghosts.map((ghostPos, index) => (
        <Group key={`ghost-${index}`} opacity={0.4}>
          <ShapeSwitch entity={entity} world={world} pos={ghostPos} render={render} />
        </Group>
      ))}
    </>
  );
};

const calculateMotionBlur = (world: World, entity: number, pos: PositionComponent, render: RenderComponent) => {
  const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
  if (!vel || !render.trailPositions || render.trailPositions.length < 3) return [];

  const speedSq = vel.dx * vel.dx + vel.dy * vel.dy;
  if (speedSq < 150 * 150) return [];

  return render.trailPositions
    .slice(-4, -1)
    .reverse()
    .map((p) => ({ ...pos, x: p.x, y: p.y }));
};

const ShapeSwitch: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, world, pos, render }) => {
  switch (render.shape) {
    case "triangle":
      return <ShipRenderer entity={entity} world={world} pos={pos} render={render} />;
    case "circle":
    case "polygon":
      return <CircleRenderer entity={entity} world={world} pos={pos} render={render} />;
    case "line":
      return <LineRenderer pos={pos} render={render} />;
    case "ufo":
      return <UfoRenderer pos={pos} render={render} />;
    case "flash":
      return <FlashRenderer entity={entity} world={world} pos={pos} render={render} />;
    default:
      return null;
  }
};
EntityRenderer.displayName = "EntityRenderer";

const ShipRenderer: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, world, pos, render }) => {
  const input = world.getComponent<InputComponent>(entity, "Input");
  const health = world.getComponent<HealthComponent>(entity, "Health");
  const ship = world.getComponent<ShipComponent>(entity, "Ship");
  const isInvulnerable = health ? health.invulnerableRemaining > 0 : false;
  const { size, rotation, color } = render;

  const blinkOpacity = isInvulnerable
    ? Math.floor(Date.now() / 150) % 2 === 0
      ? 0.3
      : 1.0
    : 1.0;

  const hyperspaceOpacity = ship && ship.hyperspaceTimer > 0
    ? (GAME_CONFIG.HYPERSPACE_DURATION - ship.hyperspaceTimer) / GAME_CONFIG.HYPERSPACE_DURATION
    : 1.0;

  return (
    <Group
      transform={[
        { translateX: pos.x },
        { translateY: pos.y },
        { rotate: (rotation * 180) / Math.PI }
      ]}
      opacity={blinkOpacity * hyperspaceOpacity}
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
ShipRenderer.displayName = "ShipRenderer";

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
CircleRenderer.displayName = "CircleRenderer";

const AsteroidRenderer: React.FC<{
  entity: number;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ pos, render }) => {
  const asteroidPath = useMemo(() => {
    if (render.vertices && render.vertices.length > 0) {
      const path = Skia.Path.Make();
      path.moveTo(render.vertices[0].x, render.vertices[0].y);
      for (let i = 1; i < render.vertices.length; i++) {
        path.lineTo(render.vertices[i].x, render.vertices[i].y);
      }
      path.close();
      return path;
    }
    return Skia.Path.Make();
  }, [render.vertices]);

  return (
    <Group
      transform={[
        { translateX: pos.x },
        { translateY: pos.y },
        { rotate: render.rotation },
      ]}
    >
      <Path path={asteroidPath} color="#333" />
      <Path
        path={asteroidPath}
        color={render.color}
        style="stroke"
        strokeWidth={2}
      />
      {render.internalLines?.map((line, i) => (
        <Line
          key={i}
          p1={{ x: line.x1, y: line.y1 }}
          p2={{ x: line.x2, y: line.y2 }}
          color="#222"
          strokeWidth={1}
        />
      ))}
    </Group>
  );
};
AsteroidRenderer.displayName = "AsteroidRenderer";

const BulletRenderer: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ pos, render }) => {
  const { trailPositions, color, size } = render;

  return (
    <Group>
      {/* Improvement 6: Bullet streak/trail */}
      {trailPositions && trailPositions.length > 1 && (
        <Group>
          {trailPositions.map((p, i) => {
            if (i === 0) return null;
            const prev = trailPositions[i - 1];
            // Skip drawing if wrapped around
            const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
            if (dist > 50) return null;

            return (
              <Line
                key={i}
                p1={{ x: prev.x, y: prev.y }}
                p2={{ x: p.x, y: p.y }}
                color={color}
                opacity={(i / trailPositions.length) * 0.8}
                strokeWidth={size}
              />
            );
          })}
        </Group>
      )}

      {/* Bullet Glow */}
      <Circle cx={pos.x} cy={pos.y} r={size * 3} color="#FFFF00" opacity={0.3}>
        <BlurMask blur={4} style="normal" />
      </Circle>

      <Circle cx={pos.x} cy={pos.y} r={size} color="#FFFFFF" />
    </Group>
  );
};
BulletRenderer.displayName = "BulletRenderer";

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
LineRenderer.displayName = "LineRenderer";

const UfoRenderer: React.FC<{
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ pos, render }) => {
  const { size, color } = render;
  const time = Date.now() / 1000;
  const yOffset = Math.sin(time * 2) * 10;

  return (
    <Group transform={[{ translateX: pos.x }, { translateY: pos.y + yOffset }]}>
      <Circle cx={0} cy={0} r={size} color={color} opacity={0.3}>
        <BlurMask blur={10} style="normal" />
      </Circle>
      <Oval
        x={-size}
        y={-size / 2}
        width={size * 2}
        height={size}
        color="#999"
      />
      <Oval
        x={-size}
        y={-size / 2.5}
        width={size * 2}
        height={size / 1.25}
        color={color}
        style="stroke"
        strokeWidth={1}
      />
      <Oval
        x={-size / 2}
        y={-size / 4 - size / 3}
        width={size}
        height={size / 1.5}
        color="#00ffff"
        opacity={0.6}
      />
      <Circle cx={-size / 2} cy={0} r={1.5} color="yellow" />
      <Circle cx={0} cy={size / 6} r={1.5} color="yellow" />
      <Circle cx={size / 2} cy={0} r={1.5} color="yellow" />
    </Group>
  );
};

const FlashRenderer: React.FC<{
  entity: number;
  world: World;
  pos: PositionComponent;
  render: RenderComponent;
}> = ({ entity, world, pos, render }) => {
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  const alpha = ttl ? ttl.remaining / ttl.total : 1;

  return (
    <Circle
      cx={pos.x}
      cy={pos.y}
      r={render.size}
      color="white"
      opacity={alpha * 0.5}
    >
      <BlurMask blur={20} style="normal" />
    </Circle>
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

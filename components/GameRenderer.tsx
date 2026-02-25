import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Circle, Line, Rect, G } from "react-native-svg";
import type { World } from "../src/game/ecs-world";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
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
 *
 * @remarks
 * This component queries the world for entities with both {@link PositionComponent}
 * and {@link RenderComponent} and renders them using cross-platform SVG components
 * from `react-native-svg` within a fixed-size container.
 *
 * @example
 * ```tsx
 * <GameRenderer world={myWorld} />
 * ```
 */
export const GameRenderer: React.FC<GameRendererProps> = ({ world }) => {
  /**
   * Memoize the list of renderable entities based on the world's structural version.
   * This avoids re-querying the world unless entities or components are added/removed.
   */
  const renderables = useMemo(
    () => world.query("Position", "Render"),
    [world.version]
  );

  return (
    <View style={styles.container}>
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
    </View>
  );
};

/**
 * Properties for the {@link EntityRenderer} component.
 */
interface EntityRendererProps {
  entity: number;
  world: World;
}

/**
 * Component for rendering a ship with thrust and pulsating effects.
 */
const ShipRenderer = React.memo(({ x, y, rotation, size, hasThrust }: {
  x: number, y: number, rotation: number, size: number, hasThrust: boolean
}) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;

  // Use a more deterministic pulsate if we had a time prop,
  // but for now we keep Date.now() but isolated.
  const time = Date.now() * 0.005;
  const pulse = Math.sin(time) * 0.1 + 1;

  return (
    <G transform={transform}>
      {hasThrust && (
        <Polygon
          points={`${-size / 2},${size / 3} ${-size * 1.5},0 ${-size / 2},${-size / 3}`}
          fill="#FF6600"
          stroke="#FF9900"
          strokeWidth="1"
          opacity="0.8"
        />
      )}
      <Circle cx="0" cy="0" r={(size / 3) * pulse} fill="#FFFF00" opacity="0.6" />
      <Polygon
        points={`${size},0 ${-size / 2},${size / 2} ${-size / 4},0 ${-size / 2},${-size / 2}`}
        fill="#DDDDDD"
        stroke="#FFFFFF"
        strokeWidth="1"
      />
      <G opacity={0.8}>
        <Rect x={-size / 2} y={-size / 4} width={size / 8} height={size / 2} fill="#666666" />
        <Rect x={-size / 2} y={size / 6} width={size / 6} height={size / 8} fill="#FF0000" />
        <Rect x={-size / 2} y={-size / 6 - size / 8} width={size / 6} height={size / 8} fill="#FF0000" />
      </G>
    </G>
  );
});
ShipRenderer.displayName = "ShipRenderer";

/**
 * Component for rendering an asteroid.
 */
const AsteroidRenderer = React.memo(({ x, y, size, color }: {
  x: number, y: number, size: number, color: string
}) => (
  <Circle cx={x} cy={y} r={size} fill="#999" stroke={color} strokeWidth="2" />
));
AsteroidRenderer.displayName = "AsteroidRenderer";

/**
 * Component for rendering a bullet/line.
 */
const BulletRenderer = React.memo(({ x, y, rotation, size, color }: {
  x: number, y: number, rotation: number, size: number, color: string
}) => {
  const rotationDegrees = (rotation * 180) / Math.PI;
  const transform = `translate(${x}, ${y}) rotate(${rotationDegrees})`;
  return (
    <Line
      x1={-size / 2} y1={0} x2={size / 2} y2={0}
      stroke={color} strokeWidth="2" transform={transform}
    />
  );
});
BulletRenderer.displayName = "BulletRenderer";

/**
 * Component for rendering a single entity.
 */
const EntityRenderer: React.FC<EntityRendererProps> = ({ entity, world }) => {
    const pos = world.getComponent<PositionComponent>(entity, "Position");
    const render = world.getComponent<RenderComponent>(entity, "Render");

    if (!pos || !render) return null;

    switch (render.shape) {
      case "triangle": {
        const input = world.getComponent<InputComponent>(entity, "Input");
        return (
          <ShipRenderer
            x={pos.x} y={pos.y} rotation={render.rotation}
            size={render.size} hasThrust={input?.thrust || false}
          />
        );
      }
      case "circle":
        return <AsteroidRenderer x={pos.x} y={pos.y} size={render.size} color={render.color} />;

      case "line":
        return <BulletRenderer x={pos.x} y={pos.y} rotation={render.rotation} size={render.size} color={render.color} />;

      default:
        return null;
    }
};
EntityRenderer.displayName = "EntityRenderer";

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

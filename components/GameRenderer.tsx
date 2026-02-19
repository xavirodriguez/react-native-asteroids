import type React from "react";
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
  const renderables = world.query("Position", "Render");

  /**
   * Renders a single entity based on its RenderComponent.
   *
   * @param entity - The entity ID to render.
   * @returns An SVG element or `null` if the shape is unknown.
   */
  const renderEntity = (entity: number) => {
    const pos = world.getComponent<PositionComponent>(entity, "Position")!;
    const render = world.getComponent<RenderComponent>(entity, "Render")!;

    const key = `entity-${entity}`;
    // Calculate rotation in degrees for react-native-svg
    const rotationDegrees = (render.rotation * 180) / Math.PI;
    const transform = `translate(${pos.x}, ${pos.y}) rotate(${rotationDegrees})`;

    switch (render.shape) {
      case "triangle": {
        const time = Date.now() * 0.005;
        const pulse = Math.sin(time) * 0.1 + 1;
        // Check if it is a ship (has Input component)
        const inputComponent = world.getComponent<InputComponent>(
          entity,
          "Input"
        );
        const hasThrust = inputComponent?.thrust || false;
        return (
          <G key={key} transform={transform}>
            {hasThrust && (
              <Polygon
                points={`${-render.size / 2},${render.size / 3} ${
                  -render.size * 1.5
                },0 ${-render.size / 2},${-render.size / 3}`}
                fill="#FF6600"
                stroke="#FF9900"
                strokeWidth="1"
                opacity="0.8"
              />
            )}
            {/* Pulsating central core */}
            <Circle
              cx="0"
              cy="0"
              r={(render.size / 3) * pulse}
              fill="#FFFF00"
              opacity="0.6"
            />
            {/* Main body */}
            <Polygon
              points={`${render.size},0 ${-render.size / 2},${
                render.size / 2
              } ${-render.size / 4},0 ${-render.size / 2},${-render.size / 2}`}
              fill="#DDDDDD"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            {/* Side thrusters */}
            <Rect
              x={-render.size / 2}
              y={-render.size / 4}
              width={render.size / 8}
              height={render.size / 2}
              fill="#666666"
            />
            <Rect
              x={-render.size / 2}
              y={render.size / 6}
              width={render.size / 6}
              height={render.size / 8}
              fill="#FF0000"
            />
            <Rect
              x={-render.size / 2}
              y={-render.size / 6 - render.size / 8}
              width={render.size / 6}
              height={render.size / 8}
              fill="#FF0000"
            />
          </G>
        );
      }
      case "circle":
        return (
          <Circle
            key={key}
            r={render.size}
            fill="#999"
            stroke={render.color}
            strokeWidth="2"
            transform={transform}
          />
        );

      case "line":
        return (
          <Line
            key={key}
            x1={-render.size / 2}
            y1={0}
            x2={render.size / 2}
            y2={0}
            stroke={render.color}
            strokeWidth="2"
            transform={transform}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Svg
        width={GAME_CONFIG.SCREEN_WIDTH}
        height={GAME_CONFIG.SCREEN_HEIGHT}
        viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
        style={styles.svg}
      >
        {renderables.map(renderEntity)}
      </Svg>
    </View>
  );
};

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

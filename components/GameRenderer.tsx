import type React from "react";
import type { World } from "../src/game/ecs-world";
import { StyleSheet } from "react-native";

import {
  type PositionComponent,
  type RenderComponent,
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
 * Component responsible for rendering the game world using SVG.
 *
 * @param props - Component properties.
 * @returns A React functional component.
 *
 * @remarks
 * This component queries the world for entities with both {@link PositionComponent}
 * and {@link RenderComponent} and renders them as SVG elements (polygons, circles, or lines)
 * within a fixed-size SVG container.
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
    // Calculate SVG transform for position and rotation
    const transform = `translate(${pos.x}, ${pos.y}) rotate(${
      (render.rotation * 180) / Math.PI
    })`;

    switch (render.shape) {
      case "triangle":
        return (
          <polygon
            key={key}
            points={`${render.size},0 ${-render.size / 2},${-render.size / 2} ${
              -render.size / 2
            },${render.size / 2}`}
            fill="none"
            stroke={render.color}
            strokeWidth="2"
            transform={transform}
          />
        );
      case "circle":
        return (
          <circle
            key={key}
            cx={pos.x}
            cy={pos.y}
            r={render.size}
            fill="none"
            stroke={render.color}
            strokeWidth="2"
          />
        );
      case "line":
        return (
          <line
            key={key}
            x1={pos.x - render.size / 2}
            y1={pos.y}
            x2={pos.x + render.size / 2}
            y2={pos.y}
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
    <div style={styles.container}>
      <svg
        width={GAME_CONFIG.SCREEN_WIDTH}
        height={GAME_CONFIG.SCREEN_HEIGHT}
        viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
        style={styles.svg}
      >
        {renderables.map(renderEntity)}
      </svg>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  svg: {
    borderColor: "#1F2937", // Tailwind's gray-800
    borderWidth: 1,
  },
});

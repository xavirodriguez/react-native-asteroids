import type React from "react";
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
        const time = Date.now() * 0.005;
        const pulse = Math.sin(time) * 0.1 + 1;
        // Verificar si es una nave (tiene componente Input)
        const inputComponent = world.getComponent<InputComponent>(
          entity,
          "Input"
        );
        const hasThrust = inputComponent?.thrust || false;
        return (
          <g key={key} transform={transform}>
            {hasThrust && (
              <polygon
                points={`${-render.size / 2},${render.size / 3} ${
                  -render.size * 1.5
                },0 ${-render.size / 2},${-render.size / 3}`}
                fill="#FF6600"
                stroke="#FF9900"
                strokeWidth="1"
                opacity="0.8"
              />
            )}
            {/* Núcleo central pulsante */}
            <circle
              cx="0"
              cy="0"
              r={(render.size / 3) * pulse}
              fill="#FFFF00"
              opacity="0.6"
            />
            {/* Cuerpo principal */}
            <polygon
              points={`${render.size},0 ${-render.size / 2},${
                render.size / 2
              } ${-render.size / 4},0 ${-render.size / 2},${-render.size / 2}`}
              fill="#DDDDDD"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            {/* Propulsores laterales */}
            <rect
              x={-render.size / 2}
              y={-render.size / 4}
              width={render.size / 8}
              height={render.size / 2}
              fill="#666666"
            />
            <rect
              x={-render.size / 2}
              y={render.size / 6}
              width={render.size / 6}
              height={render.size / 8}
              fill="#FF0000"
            />
            <rect
              x={-render.size / 2}
              y={-render.size / 6 - render.size / 8}
              width={render.size / 6}
              height={render.size / 8}
              fill="#FF0000"
            />
          </g>
        );
      case "circle":
        return (
          <circle
            key={key}
            cx={pos.x}
            cy={pos.y}
            r={render.size}
            fill="#999"
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

const styles = {
  container: {
    backgroundColor: "black",
  },
  svg: {
    border: "1px solid #1F2937",
    backgroundColor: "black",
  },
};

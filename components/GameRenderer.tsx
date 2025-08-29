import type React from "react";
import type { World } from "../src/game/ecs-world";
import {
  type PositionComponent,
  type RenderComponent,
  GAME_CONFIG,
} from "../src/types/GameTypes";

interface GameRendererProps {
  world: World;
}

export const GameRenderer: React.FC<GameRendererProps> = ({ world }) => {
  const renderables = world.query("Position", "Render");

  const renderEntity = (entity: number) => {
    const pos = world.getComponent<PositionComponent>(entity, "Position")!;
    const render = world.getComponent<RenderComponent>(entity, "Render")!;

    const key = `entity-${entity}`;
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
            stroke="#CCC"
            /* stroke={render.color} */
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
    <div className="flex-1 bg-black">
      <svg
        width={GAME_CONFIG.SCREEN_WIDTH}
        height={GAME_CONFIG.SCREEN_HEIGHT}
        viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
        className="border border-gray-800"
      >
        {renderables.map(renderEntity)}
      </svg>
    </div>
  );
};

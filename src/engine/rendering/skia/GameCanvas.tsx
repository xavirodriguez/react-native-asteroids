import React from "react";
import { Canvas, Group, Circle, Rect, Atlas, Text, Path } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { SharedCamera } from "../../core/types/SystemTypes";
import { RenderableComponent, TransformComponent } from "../../core/types/CoreTypes";
import { Entity } from "../../types/EngineTypes";

interface RenderSnapshot {
  entities: {
    id: Entity;
    transform: TransformComponent;
    renderable: RenderableComponent;
  }[];
}

interface GameCanvasProps {
  sharedCamera: SharedCamera;
  renderSnapshot: SharedValue<RenderSnapshot>;
  width: number;
  height: number;
}

/**
 * GameCanvas: Declarative root for the SkiaEngine.
 */
export const GameCanvas: React.FC<GameCanvasProps> = ({
  sharedCamera,
  renderSnapshot,
  width,
  height,
}) => {
  // Derive camera transform for the WorldLayer
  const cameraTransform = useDerivedValue(() => {
    const cam = sharedCamera.value;
    const shakeX = (Math.random() - 0.5) * cam.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * cam.shakeIntensity;

    return [
      { scale: cam.zoom },
      { translateX: -cam.x + shakeX },
      { translateY: -cam.y + shakeY },
    ];
  });

  return (
    <Canvas style={{ width, height }}>
      {/* Background Layer (Static) */}
      <Group>
        <Rect x={0} y={0} width={width} height={height} color="black" />
      </Group>

      {/* World Layer (Camera-transformed) */}
      <Group transform={cameraTransform}>
        {renderSnapshot.value.entities.map((entity) => (
          <EntityRenderer
            key={entity.id}
            transform={entity.transform}
            renderable={entity.renderable}
          />
        ))}
      </Group>

      {/* HUD Layer (Static Screen Coordinates) */}
      <Group>
        {/* Render UI elements here */}
      </Group>
    </Canvas>
  );
};

const EntityRenderer: React.FC<{
  transform: TransformComponent;
  renderable: RenderableComponent;
}> = ({ transform, renderable }) => {
  if (!renderable.visible) return null;

  return (
    <Group
      origin={{ x: transform.x, y: transform.y }}
      transform={[
        { translateX: transform.x },
        { translateY: transform.y },
        { rotate: transform.rotation },
        { scaleX: transform.scaleX },
        { scaleY: transform.scaleY },
      ]}
      opacity={renderable.opacity}
    >
      {renderable.renderType === "circle" && (
        <Circle cx={0} cy={0} r={renderable.size.radius ?? 10} color={renderable.color} />
      )}
      {renderable.renderType === "rect" && (
        <Rect
          x={-renderable.size.width / 2}
          y={-renderable.size.height / 2}
          width={renderable.size.width}
          height={renderable.size.height}
          color={renderable.color}
        />
      )}
      {/* Add other render types like sprites, atlas, text, etc. */}
    </Group>
  );
};

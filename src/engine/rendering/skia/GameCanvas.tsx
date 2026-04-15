import React from "react";
import { Platform, View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { SharedCamera } from "../../core/types/SystemTypes";
import { RandomService } from "../../utils/RandomService";
import { RenderableComponent, TransformComponent } from "../../types/EngineTypes";
import { Entity } from "../../types/EngineTypes";

// Conditionally import Skia components for non-web platforms
let Canvas: any, Group: any, Circle: any, Rect: any;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SkiaModule = require("@shopify/react-native-skia");
    Canvas = SkiaModule.Canvas;
    Group = SkiaModule.Group;
    Circle = SkiaModule.Circle;
    Rect = SkiaModule.Rect;
  } catch (_e) {
    console.warn("Skia not available");
  }
}

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
    const shakeX = (RandomService.next() - 0.5) * cam.shakeIntensity;
    const shakeY = (RandomService.next() - 0.5) * cam.shakeIntensity;

    return [
      { scale: cam.zoom },
      { translateX: -cam.x + shakeX },
      { translateY: -cam.y + shakeY },
    ];
  });

  if (Platform.OS === 'web' || !Canvas) {
    return <View style={{ width, height, backgroundColor: 'black' }} />;
  }

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
  if (!renderable.visible || !Group) return null;

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
      {renderable.renderType === "circle" && Circle && (
        <Circle cx={0} cy={0} r={renderable.radius ?? renderable.size ?? 10} color={renderable.color} />
      )}
      {renderable.renderType === "rect" && Rect && (
        <Rect
          x={-(renderable.width ?? 0) / 2}
          y={-(renderable.height ?? 0) / 2}
          width={renderable.width}
          height={renderable.height}
          color={renderable.color}
        />
      )}
      {/* Add other render types like sprites, atlas, text, etc. */}
    </Group>
  );
};

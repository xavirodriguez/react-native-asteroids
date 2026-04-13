import React, { useMemo, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import type { World } from "../src/engine/core/World";
import { GAME_CONFIG } from "../src/types/GameTypes";
import { SkiaRenderer as EngineSkiaRenderer } from "../src/engine/rendering/SkiaRenderer";
import type { SkCanvas } from "@shopify/react-native-skia";

// Conditionally import Skia components for non-web platforms
/* eslint-disable @typescript-eslint/no-require-imports */
let Canvas: any = null;
let Drawing: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SkiaModule = require("@shopify/react-native-skia");
    Canvas = SkiaModule.Canvas;
    Drawing = SkiaModule.Drawing;
  } catch (_e) {
    console.warn("Skia not available");
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Properties for the {@link GameRenderer} component.
 */
interface GameRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
  /** Callback triggered when the renderer is initialized. */
  onInitialize?: (renderer: EngineSkiaRenderer) => void;
}

/**
 * Component responsible for rendering the game world using @shopify/react-native-skia.
 */
export const GameRenderer = React.memo(function GameRenderer({
  world,
  onInitialize,
}: GameRendererProps) {
  const rendererRef = useRef<EngineSkiaRenderer | null>(null);

  const onDraw = useMemo(
    () => (canvas: SkCanvas) => {
      if (!rendererRef.current) {
        try {
          const renderer = new EngineSkiaRenderer(canvas);
          if (onInitialize) onInitialize(renderer);
          rendererRef.current = renderer;
        } catch (_err) {
          console.error("Failed to initialize Skia renderer", e);
        }
      } else {
        rendererRef.current.setCanvas(canvas);
      }
      if (rendererRef.current) {
        rendererRef.current.setSize(
          GAME_CONFIG.SCREEN_WIDTH,
          GAME_CONFIG.SCREEN_HEIGHT
        );
        rendererRef.current.render(world);
      }
    },
    [world, world.version, onInitialize]
  );

  if (Platform.OS === "web" || !Canvas || !Drawing) {
    return (
      <View
        style={[
          styles.container,
          {
            width: GAME_CONFIG.SCREEN_WIDTH,
            height: GAME_CONFIG.SCREEN_HEIGHT,
            backgroundColor: "black",
          },
        ]}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Drawing onDraw={onDraw} />
      </Canvas>
    </View>
  );
});
GameRenderer.displayName = "GameRenderer";

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

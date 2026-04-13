import React, { useMemo, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import type { World } from "../src/engine/core/World";
import { GAME_CONFIG } from "../src/types/GameTypes";

// Conditionally import Skia components for non-web platforms
let Canvas: any, Drawing: any;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SkiaModule = require("@shopify/react-native-skia");
    Canvas = SkiaModule.Canvas;
    Drawing = SkiaModule.Drawing;
  } catch (_err) {
    console.warn("Skia not available");
  }
}

/**
 * Properties for the {@link GameRenderer} component.
 */
interface GameRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
  onInitialize?: (renderer: any) => void;
}

/**
 * Component responsible for rendering the game world using @shopify/react-native-skia.
 */
export const GameRenderer = React.memo(function GameRenderer({ world, onInitialize }: GameRendererProps) {
  const rendererRef = useRef<any>(null);

  const onDraw = useMemo(() => (canvas: any) => {
    if (!rendererRef.current) {
        // We only use EngineSkiaRenderer on non-web or if explicitly needed
        // but here we are in a Skia-specific component.
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { SkiaRenderer: EngineSkiaRenderer } = require("../src/engine/rendering/SkiaRenderer");
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
        rendererRef.current.setSize(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
        rendererRef.current.render(world);
    }
  }, [world, world.version]);

  if (Platform.OS === 'web' || !Canvas || !Drawing) {
    return <View style={[styles.container, { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT, backgroundColor: 'black' }]} />;
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

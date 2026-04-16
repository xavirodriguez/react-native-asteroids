import React, { useMemo, useRef, useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import type { World } from "../src/engine/core/World";
import { GAME_CONFIG } from "../src/types/GameTypes";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { SkiaRenderer as SkiaRendererType } from "../src/engine/rendering/SkiaRenderer";
import type { Renderer } from "../src/engine/rendering/Renderer";
import { GameLoop } from "../src/engine/core/GameLoop";

type SkiaModuleType = typeof import("@shopify/react-native-skia");

// Conditionally import Skia components for non-web platforms
let Canvas: React.ComponentType<{
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  children?: React.ReactNode;
}> | null = null;
let Drawing: React.ComponentType<{ onDraw: (canvas: SkCanvas) => void }> | null = null;

if (Platform.OS !== "web") {
  try {
    const SkiaModule = require("@shopify/react-native-skia") as SkiaModuleType;
    Canvas = SkiaModule.Canvas as unknown as typeof Canvas;
    Drawing = SkiaModule.Drawing as unknown as typeof Drawing;
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
  onInitialize?: (renderer: Renderer) => void;
  gameLoop?: GameLoop;
}

/**
 * Component responsible for rendering the game world using @shopify/react-native-skia.
 */
export const GameRenderer = React.memo(function GameRenderer({ world, onInitialize, gameLoop }: GameRendererProps) {
  const rendererRef = useRef<SkiaRendererType | null>(null);
  const [, setTick] = useState(0);
  const alphaRef = useRef(1);

  useEffect(() => {
    if (gameLoop) {
      const unsubscribe = gameLoop.subscribeRender((alpha) => {
        alphaRef.current = alpha;
        setTick(t => t + 1);
      });
      return unsubscribe;
    }
  }, [gameLoop]);

  const onDraw = useMemo(() => (canvas: SkCanvas) => {
    if (!rendererRef.current) {
        try {
            const { SkiaRenderer: EngineSkiaRenderer } = require("../src/engine/rendering/SkiaRenderer") as typeof import("../src/engine/rendering/SkiaRenderer");
            const renderer = new EngineSkiaRenderer(canvas);
            if (onInitialize) onInitialize(renderer);
            rendererRef.current = renderer;
        } catch (err) {
            console.error("Failed to initialize Skia renderer", err);
        }
    } else {
      rendererRef.current.setCanvas(canvas);
    }
    if (rendererRef.current) {
        rendererRef.current.setSize(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
        rendererRef.current.setAlpha(alphaRef.current);
        rendererRef.current.render(world);
    }
  }, [world, onInitialize]);

  if (Platform.OS === 'web' || !Canvas || !Drawing || !world || typeof world.query !== "function") {
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

import React, { useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Drawing } from "@shopify/react-native-skia";
import { SkiaRenderer as EngineSkiaRenderer } from "../src/engine/rendering/SkiaRenderer";
import type { World } from "../src/engine/core/World";
import { GAME_CONFIG } from "../src/types/GameTypes";

/**
 * Properties for the {@link GameRenderer} component.
 */
interface GameRendererProps {
  /** The ECS world containing the entities to be rendered. */
  world: World;
}

/**
 * Component responsible for rendering the game world using @shopify/react-native-skia.
 */
export const GameRenderer = React.memo(function GameRenderer({ world }: GameRendererProps) {
  const rendererRef = useRef<EngineSkiaRenderer | null>(null);

  const onDraw = useMemo(() => (canvas: any) => {
    if (!rendererRef.current) {
      rendererRef.current = new EngineSkiaRenderer(canvas);
    } else {
      rendererRef.current.setCanvas(canvas);
    }
    rendererRef.current.setSize(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
    rendererRef.current.render(world);
  }, [world, world.version]);

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

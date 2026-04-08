import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  GAME_CONFIG,
} from "../src/types/GameTypes";
import { CanvasRenderer as EngineCanvasRenderer } from "../src/engine/rendering/CanvasRenderer";
import type { World } from "../src/engine/core/World";
import { Renderer } from "../src/engine/rendering/Renderer";
import { GameLoop } from "../src/engine/core/GameLoop";

interface CanvasRendererProps {
  world: World;
  gameLoop?: GameLoop;
  onInitialize?: (renderer: Renderer) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ world, gameLoop, onInitialize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EngineCanvasRenderer | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!rendererRef.current) {
      const renderer = new EngineCanvasRenderer(ctx);
      if (onInitialize) onInitialize(renderer);
      rendererRef.current = renderer;
    } else {
      rendererRef.current.setContext(ctx);
    }
    rendererRef.current.setSize(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);

    // Initial render
    rendererRef.current.render(world);

    if (gameLoop) {
      const unsubscribe = gameLoop.subscribeRender(() => {
        if (rendererRef.current) {
          rendererRef.current.render(world);
        }
      });
      return unsubscribe;
    }
  }, [world, gameLoop, onInitialize]);

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.SCREEN_WIDTH}
        height={GAME_CONFIG.SCREEN_HEIGHT}
        style={{
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
        }}
      />
      ) : (
        <View style={{ width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT, backgroundColor: 'black' }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
});

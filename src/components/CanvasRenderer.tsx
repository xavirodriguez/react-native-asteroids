import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  GAME_CONFIG,
} from "../types/GameTypes";
import { CanvasRenderer as EngineCanvasRenderer } from "../engine/rendering/CanvasRenderer";
import type { World } from "../engine/core/World";
import type { Renderer } from "../engine/rendering/Renderer";

interface CanvasRendererProps {
  world: World;
  onInitialize?: (renderer: Renderer) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ world, onInitialize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EngineCanvasRenderer | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new EngineCanvasRenderer(ctx);
      if (onInitialize) {
        onInitialize(rendererRef.current);
      }
    } else {
      rendererRef.current.setContext(ctx);
    }
    rendererRef.current.setSize(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);

    let animationFrameId: number;

    const render = () => {
      if (rendererRef.current) {
        rendererRef.current.render(world);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [world, onInitialize]);

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

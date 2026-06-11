import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { World, GameLoop, Renderer } from "@tiny-aster/core";
import { CanvasRenderer as EngineCanvasRenderer } from "../src/rendering/CanvasRenderer";

interface CanvasRendererProps {
  world: World;
  gameLoop?: GameLoop;
  onInitialize?: (renderer: any) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ world, gameLoop, onInitialize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EngineCanvasRenderer | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new EngineCanvasRenderer();
      if (onInitialize) {
        onInitialize(rendererRef.current);
      }
    }

    const unsub = gameLoop?.subscribeRender((alpha) => {
      if (rendererRef.current) {
        rendererRef.current.render(world, ctx);
      }
    });

    return () => {
      unsub?.();
    };
  }, [world, gameLoop, onInitialize]);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});

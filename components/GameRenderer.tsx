import React, { useRef, useEffect, useState } from "react";
import { StyleSheet, Platform } from "react-native";
import { World, GameLoop, SkiaRenderer } from "@tiny-aster/core";

interface GameRendererProps {
  world: World<any>;
  gameLoop?: GameLoop;
  onInitialize?: (renderer: SkiaRenderer) => void;
}

export const GameRenderer: React.FC<GameRendererProps> = ({ world, gameLoop, onInitialize }) => {
  const rendererRef = useRef<SkiaRenderer | null>(null);

  const [CanvasComponent, setCanvasComponent] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Dynamically import Skia components for native
    const { Canvas } = require("@shopify/react-native-skia");
    setCanvasComponent(() => Canvas);

    if (!rendererRef.current) {
        rendererRef.current = new SkiaRenderer();
        if (onInitialize) {
            onInitialize(rendererRef.current);
        }
    }
  }, [onInitialize]);

  if (Platform.OS === "web" || !CanvasComponent) {
    return null;
  }

  return (
    <CanvasComponent style={styles.container}>
        {/* We need a way to trigger render in Skia component */}
    </CanvasComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});

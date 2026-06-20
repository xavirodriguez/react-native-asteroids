import React, { useRef, useEffect, useState } from "react";
import { StyleSheet, Platform } from "react-native";
import { World, GameLoop } from "@tiny-aster/core";
import { SkiaRenderer } from "@tiny-aster/renderer-skia";

interface GameRendererProps {
  world: World<any>;
  gameLoop?: GameLoop;
  onInitialize?: (renderer: SkiaRenderer) => void;
}

/**
 * React component for rendering the ECS world using Skia.
 *
 * @remarks
 * This component acts as a bridge between the React lifecycle and the
 * simulation's rendering phase.
 *
 * @warning
 * **Loop Decoupling**: Rendering is decoupled from the logical simulation loop.
 * While the simulation may run at a fixed timestep, the renderer attempts to
 * match the device's native refresh rate.
 */
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

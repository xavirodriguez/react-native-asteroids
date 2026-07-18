import React, { useRef, useEffect, useState, useMemo } from "react";
import { StyleSheet, Platform } from "react-native";
import { World, GameLoop, ComponentRegistry } from "@tiny-aster/core";
import { SkiaRenderer } from "@tiny-aster/renderer-skia";
import { useFrameCallback, runOnJS } from "react-native-reanimated";

interface GameRendererProps<TRegistry extends ComponentRegistry> {
  world: World<TRegistry>;
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
export const GameRenderer = <TRegistry extends ComponentRegistry>({
  world: _world,
  gameLoop: propGameLoop,
  onInitialize,
}: GameRendererProps<TRegistry>) => {
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const onInitializeRef = useRef(onInitialize);
  onInitializeRef.current = onInitialize;

  const [CanvasComponent, setCanvasComponent] = useState<React.ElementType | null>(null);

  const gameLoop = useMemo(() => {
    if (propGameLoop) return propGameLoop;
    return new GameLoop({ manual: Platform.OS !== "web" });
  }, [propGameLoop]);

  useFrameCallback((frameInfo) => {
    if (Platform.OS === "web") return;

    if (gameLoop) {
      runOnJS(gameLoop.tick.bind(gameLoop))(frameInfo.timestamp);
    }
  }, true);

  useEffect(() => {
    if ((Platform.OS as string) === "web") return;

    // Dynamically import Skia components for native
    const { Canvas } = require("@shopify/react-native-skia");
    setCanvasComponent(() => Canvas);

    if (!rendererRef.current) {
        rendererRef.current = new SkiaRenderer();
        if (onInitializeRef.current) {
          onInitializeRef.current(rendererRef.current);
        }
    }

    if ((Platform.OS as string) !== "web") {
      gameLoop.stopInternalLoop();
    }

    gameLoop.start();

    return () => {
      gameLoop.stop();
    };
  }, [gameLoop]);

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

import React, { useMemo, useRef, useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
<<<<<<< HEAD
import { World, GameLoop, Renderer } from "@tiny-aster/core";
import { SkiaRenderer } from "../src/rendering/SkiaRenderer";
import type { SkCanvas } from "@shopify/react-native-skia";
=======
import type { World } from "@tiny-aster/core";
import { GAME_CONFIG } from "../src/types/GameTypes";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { SkiaRenderer as SkiaRendererType } from "@tiny-aster/core";
import type { Renderer } from "@tiny-aster/core";
import { GameLoop } from "@tiny-aster/core";
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376

interface GameRendererProps {
  world: World;
  gameLoop?: GameLoop;
  onInitialize?: (renderer: any) => void;
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

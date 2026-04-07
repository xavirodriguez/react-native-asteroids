import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  GAME_CONFIG,
} from "../src/types/GameTypes";
import { CanvasRenderer as EngineCanvasRenderer } from "../src/engine/rendering/CanvasRenderer";
import type { World } from "../src/engine/core/World";
import { drawShip, drawUfo, drawFlash, drawAsteroidStarField, drawAsteroidCRTEffect, drawAsteroidShipTrailDrawer } from "../src/games/asteroids/rendering/AsteroidShapeDrawers";

interface CanvasRendererProps {
  world: World;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ world }) => {
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

      // Register Asteroids-specific shape drawers
      renderer.registerShapeDrawer("triangle", drawShip);
      renderer.registerShapeDrawer("ufo", drawUfo);
      renderer.registerShapeDrawer("flash", drawFlash);

      // Register post-entity drawers (drawn after ctx.restore())
      renderer.registerPostEntityDrawer("triangle", drawAsteroidShipTrailDrawer);

      // Register custom hooks for Asteroids
      renderer.addPreRenderHook((ctx, world) => {
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? (world.getComponent<any>(gameStateEntity, "GameState")) : null;
        if (gameState?.stars) {
          drawAsteroidStarField(ctx, gameState.stars, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT, world);
        }
      });

      renderer.addPostRenderHook((ctx, world) => {
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? (world.getComponent<any>(gameStateEntity, "GameState")) : null;
        if (gameState?.debugCRT !== false) {
          drawAsteroidCRTEffect(ctx, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT);
        }
      });

      rendererRef.current = renderer;
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
  }, [world]);

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

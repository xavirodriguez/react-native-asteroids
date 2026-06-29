import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
  BounceIn,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
} from "react-native-reanimated";
import type { GameStateComponent } from "../games/space-invaders/types/SpaceInvadersTypes";

/**
 * Type definition for the @shopify/react-native-skia module.
 */
type SkiaModuleType = typeof import("@shopify/react-native-skia");

/**
 * Props for the Skia Canvas component.
 */
interface CanvasProps {
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Props for the Skia BackdropBlur component.
 */
interface BackdropBlurProps {
  blur: number;
  clip?: { x: number; y: number; width: number; height: number };
  children?: React.ReactNode;
}

/**
 * Props for the Skia Fill component.
 */
interface FillProps {
  color: string;
}

type CanvasComponent = React.ComponentType<CanvasProps>;
type BackdropBlurComponent = React.ComponentType<BackdropBlurProps>;
type FillComponent = React.ComponentType<FillProps>;

// Conditionally import Skia components for non-web platforms
let Canvas: CanvasComponent | null = null;
let BackdropBlur: BackdropBlurComponent | null = null;
let Fill: FillComponent | null = null;

if (Platform.OS !== "web") {
  try {
    const SkiaModule = require("@shopify/react-native-skia") as SkiaModuleType;
    Canvas = SkiaModule.Canvas as unknown as CanvasComponent;
    BackdropBlur = SkiaModule.BackdropBlur as unknown as BackdropBlurComponent;
    Fill = SkiaModule.Fill as unknown as FillComponent;
  } catch (_err) {
    // Skia not available
  }
}

/**
 * Properties for the {@link SpaceInvadersUI} component.
 */
interface SpaceInvadersUIProps {
  /** The current game state component containing lives, score, and level. */
  gameState: GameStateComponent;
  /** Callback triggered when the restart button is pressed. */
  onRestart?: () => void;
  /** Callback triggered when the pause button is pressed. */
  onPause?: () => void;
  /** Whether the game is currently paused. */
  isPaused?: boolean;
  /** The persistent high score. */
  highScore?: number;
  /** Current game seed. */
  seed?: number;
  /** Callback to set a new seed. */
  onSetSeed?: (seed: number) => void;
}

/**
 * Component responsible for rendering the Head-Up Display (HUD) overlay for Space Invaders.
 */
export const SpaceInvadersUI = React.memo(function SpaceInvadersUI({
  gameState,
  onRestart,
  onPause,
  isPaused,
  highScore,
  seed,
  onSetSeed,
}: SpaceInvadersUIProps) {
  const insets = useSafeAreaInsets();
  const showPauseButton = Platform.OS !== "web" && !gameState.isGameOver;

  return (
    <View style={styles.container}>
      <HUD
        lives={gameState.lives}
        score={gameState.score}
        level={gameState.level}
        highScore={highScore ?? 0}
        paddingTop={Math.max(insets.top, 16)}
      />
      {showPauseButton && (
        <PauseButton
          onPress={onPause}
          isPaused={isPaused}
          paddingTop={Math.max(insets.top, 16)}
        />
      )}
      {gameState.isGameOver && (
        <GameOverOverlay
          score={gameState.score}
          highScore={highScore ?? 0}
          onRestart={onRestart}
        />
      )}
    </View>
  );
});

const HUD: React.FC<{
  lives: number;
  score: number;
  level: number;
  highScore: number;
  paddingTop: number;
}> = ({ lives, score, level, highScore, paddingTop }) => (
  <Animated.View
    entering={FadeIn.duration(1000)}
    style={[styles.topBar, { paddingTop }]}
  >
    {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
      <Canvas style={StyleSheet.absoluteFill}>
        <BackdropBlur blur={10} clip={{ x: 0, y: 0, width: 2000, height: 100 }}>
            <Fill color="rgba(0, 0, 0, 0.4)" />
        </BackdropBlur>
      </Canvas>
    )}
    <View style={styles.hudContent}>
      <Text style={styles.text}>Lives: {lives}</Text>
      <Score score={score} />
      <Text style={styles.text}>HS: {highScore}</Text>
      <Text style={styles.text}>Level: {level}</Text>
    </View>
  </Animated.View>
);

const Score: React.FC<{ score: number }> = ({ score }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 2, stiffness: 80 }),
      withSpring(1)
    );
  }, [score, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.text, { color: "#00FF44" }]}>Score: {score}</Text>
    </Animated.View>
  );
};

const PauseButton: React.FC<{
  onPress?: () => void;
  isPaused?: boolean;
  paddingTop: number;
}> = ({ onPress, isPaused, paddingTop }) => (
  <TouchableOpacity
    style={[styles.pauseButton, { top: paddingTop }]}
    onPress={onPress}
  >
    <Text style={styles.pauseButtonText}>{isPaused ? "▶" : "II"}</Text>
  </TouchableOpacity>
);

const GameOverOverlay: React.FC<{
  score: number;
  highScore: number;
  onRestart?: () => void;
}> = ({ score, highScore, onRestart }) => (
  <Animated.View
    entering={FadeIn.duration(500)}
    style={styles.gameOverOverlay}
  >
    {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
      <Canvas style={StyleSheet.absoluteFill}>
        <BackdropBlur blur={20}>
            <Fill color="rgba(0, 0, 0, 0.6)" />
        </BackdropBlur>
      </Canvas>
    )}

    <Animated.Text
      entering={ZoomIn.delay(300).duration(800)}
      style={styles.gameOverText}
    >
      GAME OVER
    </Animated.Text>

    <Animated.View entering={SlideInDown.delay(600).duration(800)} style={{ alignItems: "center" }}>
      <Text style={styles.finalScoreText}>Final Score: {score}</Text>
      <Text style={styles.highScoreText}>
        {score >= highScore ? "¡NUEVO RÉCORD!" : `Récord actual: ${highScore}`}
      </Text>

      <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
        <Text style={styles.restartButtonText}>RESTART</Text>
      </TouchableOpacity>
    </Animated.View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: "box-none",
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 10,
    overflow: "hidden",
  },
  hudContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "monospace",
    fontWeight: "bold",
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 10px rgba(0, 255, 68, 0.8)' }
      : {
          textShadowColor: "rgba(0, 255, 68, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        }
    ),
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "auto",
  },
  gameOverText: {
    color: "#FF0044",
    fontSize: 64,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 20px rgba(255, 0, 0, 0.8)' }
      : {
          textShadowColor: "rgba(255, 0, 0, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 20,
        }
    ),
  },
  finalScoreText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  highScoreText: {
    color: "#FFD700",
    fontSize: 20,
    fontFamily: "monospace",
    marginBottom: 40,
  },
  restartButton: {
    backgroundColor: "#00FF44",
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 15px rgba(0, 255, 68, 0.8)' }
      : {
          shadowColor: "#00FF44",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
        }
    ),
  },
  restartButtonText: {
    color: "#000000",
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  pauseButton: {
    position: "absolute",
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
  pauseButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
});

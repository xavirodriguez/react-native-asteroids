import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
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
import type { GameStateComponent } from "../src/types/GameTypes";

// Conditionally import Skia components
/* eslint-disable @typescript-eslint/no-require-imports */
let Canvas: any = null;
let BackdropBlur: any = null;
let Fill: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SkiaModule = require("@shopify/react-native-skia");
    Canvas = SkiaModule.Canvas;
    BackdropBlur = SkiaModule.BackdropBlur;
    Fill = SkiaModule.Fill;
  } catch (_e) {
    // Skia not available
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Properties for the {@link GameUI} component.
 */
interface GameUIProps {
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
}

/**
 * Component responsible for rendering the Head-Up Display (HUD) overlay.
 */
export const GameUI = React.memo(function GameUI({
  gameState,
  onRestart,
  onPause,
  isPaused,
  highScore,
}: GameUIProps) {
  const insets = useSafeAreaInsets();
  const [levelUpText, setLevelUpText] = useState<string | null>(null);
  const showPauseButton = Platform.OS !== "web" && !gameState.isGameOver;

  useEffect(() => {
    if (gameState.level > 1 && !gameState.isGameOver) {
      setLevelUpText(`NIVEL ${gameState.level}`);
      const timer = setTimeout(() => setLevelUpText(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.level, gameState.isGameOver]);

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
      {levelUpText && <LevelUpOverlay text={levelUpText} />}
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
  }, [score]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.text, { color: "#00FFDD" }]}>Score: {score}</Text>
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

const LevelUpOverlay: React.FC<{ text: string }> = ({ text }) => (
  <Animated.View
    entering={BounceIn.duration(1000)}
    exiting={FadeOut.duration(500)}
    style={styles.levelUpOverlay}
    pointerEvents="none"
  >
    <Text style={styles.levelUpText}>{text}</Text>
  </Animated.View>
);

const GameOverOverlay: React.FC<{
  score: number;
  highScore: number;
  onRestart?: () => void;
}> = ({ score, highScore, onRestart }) => (
  <Animated.View entering={FadeIn.duration(500)} style={styles.gameOverOverlay}>
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

    <Animated.View
      entering={SlideInDown.delay(600).duration(800)}
      style={{ alignItems: "center" }}
    >
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
    textShadowColor: "rgba(0, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
    textShadowColor: "rgba(255, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
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
    backgroundColor: "#00FFDD",
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: "#00FFDD",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
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
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  levelUpText: {
    fontSize: 60,
    color: "#00FF88",
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 255, 136, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
});

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GameStateComponent } from "../src/types/GameTypes";

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
 *
 * @param props - Component properties.
 * @returns A React functional component.
 *
 * @remarks
 * Displays essential game information such as remaining lives, current score,
 * and current level at the top of the screen.
 * It also displays a "GAME OVER" message and a "RESTART" button when the game is over.
 *
 * @example
 * ```tsx
 * <GameUI gameState={currentGameState} onRestart={() => game.restart()} />
 * ```
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
      const timer = setTimeout(() => setLevelUpText(null), 1500);
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
  <View style={[styles.topBar, { paddingTop }]}>
    <Text style={styles.text}>Lives: {lives}</Text>
    <Text style={styles.text}>Score: {score}</Text>
    <Text style={styles.text}>HS: {highScore}</Text>
    <Text style={styles.text}>Level: {level}</Text>
  </View>
);

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
  <View style={styles.levelUpOverlay} pointerEvents="none">
    <Text style={styles.levelUpText}>{text}</Text>
  </View>
);

const GameOverOverlay: React.FC<{
  score: number;
  highScore: number;
  onRestart?: () => void;
}> = ({ score, highScore, onRestart }) => (
  <View style={styles.gameOverOverlay}>
    <Text style={styles.gameOverText}>GAME OVER</Text>
    <Text style={styles.finalScoreText}>Final Score: {score}</Text>
    <Text style={styles.highScoreText}>
      {score >= highScore ? "¡Nuevo récord!" : `Récord: ${highScore}`}
    </Text>
    <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
      <Text style={styles.restartButtonText}>RESTART</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: "box-none", // Allow interactions with elements behind if not blocked
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "auto", // Block interactions with elements behind
  },
  gameOverText: {
    color: "#FF0000",
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 10,
  },
  finalScoreText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  highScoreText: {
    color: "#FFD700",
    fontSize: 18,
    fontFamily: "monospace",
    marginBottom: 30,
  },
  restartButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 5,
  },
  restartButtonText: {
    color: "#000000",
    fontSize: 20,
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
    fontSize: 40,
    color: "#00FF88",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
});

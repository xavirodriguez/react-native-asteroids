import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { FlappyBirdState } from "../games/flappybird/types/FlappyBirdTypes";

interface FlappyBirdUIProps {
  gameState: FlappyBirdState;
  onRestart: () => void;
  onPause: () => void;
  isPaused: boolean;
  highScore: number;
}

export const FlappyBirdUI: React.FC<FlappyBirdUIProps> = ({
  gameState,
  onRestart,
  onPause,
  isPaused,
  highScore,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.hud}>
        <View>
          <Text style={styles.hudText}>SCORE: {gameState.score}</Text>
          <Text style={styles.highScoreText}>HI-SCORE: {highScore}</Text>
        </View>
        <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
          <Text style={styles.pauseButtonText}>{isPaused ? "RESUME" : "PAUSE"}</Text>
        </TouchableOpacity>
      </View>

      {gameState.isGameOver && (
        <View style={styles.overlay}>
          <Text style={styles.gameOverText}>GAME OVER</Text>
          <Text style={styles.finalScoreText}>FINAL SCORE: {gameState.score}</Text>
          <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
            <Text style={styles.restartButtonText}>RESTART</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPaused && !gameState.isGameOver && (
        <View style={styles.overlay}>
          <Text style={styles.pausedText}>PAUSED</Text>
          <TouchableOpacity style={styles.resumeButton} onPress={onPause}>
            <Text style={styles.resumeButtonText}>RESUME</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 40,
  },
  hudText: {
    color: "white",
    fontSize: 24,
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  highScoreText: {
    color: "#FFFF00",
    fontSize: 16,
    fontFamily: "monospace",
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pauseButton: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
  },
  pauseButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  gameOverText: {
    color: "#FF0000",
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 10,
  },
  finalScoreText: {
    color: "white",
    fontSize: 24,
    fontFamily: "monospace",
    marginBottom: 30,
  },
  pausedText: {
    color: "white",
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 30,
  },
  restartButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  restartButtonText: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
  },
  resumeButton: {
    backgroundColor: "white",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  resumeButtonText: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
  },
});

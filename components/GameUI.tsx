import type React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { GameStateComponent } from "../src/types/GameTypes";

/**
 * Properties for the {@link GameUI} component.
 */
interface GameUIProps {
  /** The current game state component containing lives, score, and level. */
  gameState: GameStateComponent | null;
  /** Callback triggered when the restart button is pressed. */
  onRestart?: () => void;
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
export const GameUI: React.FC<GameUIProps> = ({ gameState, onRestart }) => {
  if (!gameState) return null;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.text}>Lives: {gameState.lives}</Text>
        <Text style={styles.text}>Score: {gameState.score}</Text>
        <Text style={styles.text}>Level: {gameState.level}</Text>
      </View>

      {gameState.isGameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverText}>GAME OVER</Text>
          <Text style={styles.finalScoreText}>Final Score: {gameState.score}</Text>
          <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
            <Text style={styles.restartButtonText}>RESTART</Text>
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
    zIndex: 1000,
    pointerEvents: "box-none", // Allow interactions with elements behind if not blocked
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
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
});

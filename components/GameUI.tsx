import type React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { GameStateComponent } from "../src/types/GameTypes";

/**
 * Properties for the {@link GameUI} component.
 */
interface GameUIProps {
  /** The current game state component containing lives, score, and level. */
  gameState: GameStateComponent | null;
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
 *
 * @example
 * ```tsx
 * <GameUI gameState={currentGameState} />
 * ```
 */
export const GameUI: React.FC<GameUIProps> = ({ gameState }) => {
  if (!gameState) return null;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.text}>Lives: {gameState.lives}</Text>
        <Text style={styles.text}>Score: {gameState.score}</Text>
        <Text style={styles.text}>Level: {gameState.level}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
});

import type React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { GameStateComponent } from "../src/types/GameTypes";

interface GameUIProps {
  gameState: GameStateComponent | null;
}

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

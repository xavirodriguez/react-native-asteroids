import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

interface DailyResultsOverlayProps {
  gameId: string;
  score: number;
  seed: number;
  onClose: () => void;
}

export const DailyResultsOverlay: React.FC<DailyResultsOverlayProps> = ({ gameId, score, seed, onClose }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESULTADOS DIARIOS</Text>
      <Text style={styles.gameText}>{gameId.toUpperCase()}</Text>
      <Text style={styles.scoreText}>PUNTUACIÓN: {score}</Text>
      <Text style={styles.seedText}>SEED: {seed}</Text>
      <TouchableOpacity style={styles.button} onPress={onClose}>
        <Text style={styles.buttonText}>CONTINUAR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.9)",
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 20,
  },
  gameText: {
    color: "white",
    fontSize: 18,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  scoreText: {
    color: "white",
    fontSize: 20,
    fontFamily: "monospace",
    marginBottom: 5,
  },
  seedText: {
    color: "#888",
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "black",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});

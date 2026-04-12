import { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { PongControls } from "@/components/PongControls";
import { usePongGame } from "@/hooks/usePongGame";

export default function PongScreen() {
  const [started, setStarted] = useState(false);
  const { game, gameState, handleInput, _isPaused, _togglePause } = usePongGame();

  if (!game) return null;

  if (!started) {
    return (
      <View style={styles.startScreen}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PONG</Text>
        <Text style={styles.instructions}>
            {Platform.OS === "web" ? "P1: W/S  P2: Flechas" : "Modo Local"}
        </Text>
        <TouchableOpacity style={styles.startButton} onPress={() => setStarted(true)}>
          <Text style={styles.startButtonText}>EMPEZAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>

        <View style={styles.scoreBoard}>
            <Text style={styles.scoreText}>{gameState?.scoreP1 ?? 0}</Text>
            <View style={{ width: 100 }} />
            <Text style={styles.scoreText}>{gameState?.scoreP2 ?? 0}</Text>
        </View>

        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        <PongControls
          onP1Up={(pressed) => handleInput({ p1Up: pressed })}
          onP1Down={(pressed) => handleInput({ p1Down: pressed })}
          onP2Up={(pressed) => handleInput({ p2Up: pressed })}
          onP2Down={(pressed) => handleInput({ p2Down: pressed })}
        />

        {gameState?.isGameOver && (
            <View style={styles.overlay}>
                <Text style={styles.overlayText}>FIN DEL JUEGO</Text>
                <TouchableOpacity style={styles.restartButton} onPress={() => game.restart()}>
                    <Text style={styles.restartButtonText}>REINTENTAR</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  startScreen: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    color: "white",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
  },
  instructions: {
    fontSize: 18,
    color: "#AAAAAA",
    fontFamily: "monospace",
    marginBottom: 40,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "white",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  startButtonText: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
  },
  scoreBoard: {
    position: 'absolute',
    top: 60,
    flexDirection: 'row',
    zIndex: 10,
  },
  scoreText: {
    color: 'white',
    fontSize: 48,
    fontFamily: 'monospace',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayText: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  restartButtonText: {
    color: "black",
    fontWeight: "bold",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 100,
    padding: 10,
  },
  backButtonText: {
    color: "#AAAAAA",
    fontSize: 16,
    fontFamily: "monospace",
  }
});

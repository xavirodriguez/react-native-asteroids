import { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
// Note: Component imports use the '@/' alias configured in tsconfig.json
import { CanvasRenderer } from "../../components/CanvasRenderer";
import { GameControls } from "../../components/GameControls";
import { GameUI } from "../../components/GameUI";
import { useAsteroidsGame } from "../hooks/useAsteroidsGame";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";

/**
 * Main application component that integrates the game engine with the React UI.
 */
export default function App() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useAsteroidsGame();
  const [started, setStarted] = useState(false);

  if (!game) {
    return <View />;
  }

  if (!started) {
    return (
      <SafeAreaProvider>
        <StartScreen highScore={highScore} onStart={() => setStarted(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <GameUI
          gameState={gameState}
          onRestart={() => game.restart()}
          onPause={() => togglePause()}
          isPaused={isPaused}
          highScore={highScore}
        />
        <CanvasRenderer
          world={game.getWorld()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />
        <GameControls
          onThrust={(pressed) => handleInput({ thrust: pressed })}
          onRotateLeft={(pressed) => handleInput({ rotateLeft: pressed })}
          onRotateRight={(pressed) => handleInput({ rotateRight: pressed })}
          onShoot={(pressed) => handleInput({ shoot: pressed })}
          onHyperspace={(pressed) => handleInput({ hyperspace: pressed })}
        />
      </View>
    </SafeAreaProvider>
  );
}

const StartScreen: React.FC<{ highScore: number; onStart: () => void }> = ({
  highScore,
  onStart,
}) => {
  const instructions =
    Platform.OS === "web"
      ? "↑ Empujar  ←→ Rotar  Espacio Disparar  Shift Hiperspacio"
      : "Controles táctiles en pantalla";

  return (
    <View style={styles.startScreen}>
      <Text className="bg-red-500 px-4 py-2" style={styles.title}>
        ASTEROIDES
      </Text>
      <Text style={styles.instructions}>{instructions}</Text>
      <Text style={styles.highScoreText}>Récord: {highScore}</Text>
      <TouchableOpacity style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>JUGAR</Text>
      </TouchableOpacity>
    </View>
  );
};

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
    marginBottom: 20,
  },
  instructions: {
    fontSize: 16,
    color: "#CCCCCC",
    fontFamily: "monospace",
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  highScoreText: {
    fontSize: 20,
    color: "#FFD700",
    fontFamily: "monospace",
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: "white",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startButtonText: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
  },
});

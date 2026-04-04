import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameUI } from "@/components/GameUI";
import { GameControls } from "@/components/GameControls";
import { useAsteroidsGame } from "@/hooks/useAsteroidsGame";
import { useMultiplayer } from "@/multiplayer/useMultiplayer";

export default function AsteroidsScreen() {
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useAsteroidsGame(isMulti && started);
  const [playerName, setPlayerName] = useState("Jugador");

  const { room, connected, serverState } = useMultiplayer("asteroids", playerName, isMulti && started);

  useEffect(() => {
    if (isMulti && connected && game) {
      (game as any).setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  useEffect(() => {
    if (isMulti && serverState && game) {
        (game as any).updateFromServer(serverState);
    }
  }, [isMulti, serverState, game]);

  if (!game) return null;

  if (!started) {
    return (
      <StartScreen
        title="ASTEROIDES"
        highScore={highScore}
        onStart={() => { setIsMulti(false); setStarted(true); }}
        onStartMulti={() => { setIsMulti(true); setStarted(true); }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? "↑ Empujar  ←→ Rotar  Espacio Disparar  Shift Hiperspacio" : "Controles táctiles"}
      />
    );
  }

  const handleMultiplayerInput = (input: any) => {
    if (isMulti && room) {
        room.send("input", input);
    } else {
        handleInput(input);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>

        {isMulti && !connected && (
            <View style={styles.overlay}>
                <Text style={styles.overlayText}>Conectando...</Text>
            </View>
        )}

        <GameUI
          gameState={gameState}
          onRestart={() => isMulti ? room?.send("start_game") : game.restart()}
          onPause={() => togglePause()}
          isPaused={isPaused}
          highScore={highScore}
        />
        <CanvasRenderer
          world={game.getWorld()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />
        <GameControls
          onThrust={(pressed) => handleMultiplayerInput({ thrust: pressed })}
          onRotateLeft={(pressed) => handleMultiplayerInput({ rotateLeft: pressed })}
          onRotateRight={(pressed) => handleMultiplayerInput({ rotateRight: pressed })}
          onShoot={(pressed) => handleMultiplayerInput({ shoot: pressed })}
          onHyperspace={(pressed) => handleMultiplayerInput({ hyperspace: pressed })}
        />
      </View>
    </SafeAreaProvider>
  );
}

const StartScreen: React.FC<{
  title: string;
  highScore: number;
  onStart: () => void;
  onStartMulti: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  instructions: string;
}> = ({
  title,
  highScore,
  onStart,
  onStartMulti,
  playerName,
  onPlayerNameChange,
  instructions,
}) => {
  return (
    <SafeAreaProvider>
      <View style={styles.startScreen}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>

        <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={onPlayerNameChange}
            placeholder="Tu nombre"
            placeholderTextColor="#666"
        />

        <Text style={styles.instructions}>{instructions}</Text>
        <Text style={styles.highScoreText}>Récord: {highScore}</Text>

        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.startButton} onPress={onStart}>
                <Text style={styles.startButtonText}>SOLO</Text>
            </TouchableOpacity>
            <View style={{ width: 20 }} />
            <TouchableOpacity style={[styles.startButton, { backgroundColor: '#444' }]} onPress={onStartMulti}>
                <Text style={[styles.startButtonText, { color: 'white' }]}>MULTI</Text>
            </TouchableOpacity>
        </View>
      </View>
    </SafeAreaProvider>
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
    width: '100%',
  },
  title: {
    fontSize: 48,
    color: "white",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
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
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#222',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    width: 250,
    marginBottom: 20,
    fontFamily: 'monospace',
    textAlign: 'center',
    fontSize: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'monospace',
  },
  startButtonText: {
    color: "black",
    fontSize: 20,
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

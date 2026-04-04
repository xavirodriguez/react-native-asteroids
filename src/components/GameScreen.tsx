import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/src/components/CanvasRenderer";
import { World } from "@/src/engine/core/World";
import { Renderer } from "@/src/engine/rendering/Renderer";

interface GameScreenProps {
  title: string;
  highScore: number;
  instructions: string;
  game: {
    getWorld: () => World;
    initializeRenderer: (renderer: Renderer) => void;
    restart: () => void;
  } | null;
  gameState: any;
  isPaused: boolean;
  togglePause: () => void;
  uiComponent: React.ComponentType<any>;
  controlsComponent: React.ComponentType<any>;
  handleInput: (input: any) => void;
  controlHandlers: Record<string, (pressed: boolean) => void>;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  title,
  highScore,
  instructions,
  game,
  gameState,
  isPaused,
  togglePause,
  uiComponent: UI,
  controlsComponent: Controls,
  controlHandlers,
}) => {
  const [started, setStarted] = useState(false);

  if (!game) return null;

  if (!started) {
    return (
      <StartScreen
        title={title}
        highScore={highScore}
        onStart={() => setStarted(true)}
        instructions={instructions}
      />
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

        <UI
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
        <Controls {...controlHandlers} />
      </View>
    </SafeAreaProvider>
  );
};

const StartScreen: React.FC<{
  title: string;
  highScore: number;
  onStart: () => void;
  instructions: string;
}> = ({
  title,
  highScore,
  onStart,
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
        <Text style={styles.instructions}>{instructions}</Text>
        <Text style={styles.highScoreText}>Récord: {highScore}</Text>
        <TouchableOpacity style={styles.startButton} onPress={onStart}>
          <Text style={styles.startButtonText}>JUGAR</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
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

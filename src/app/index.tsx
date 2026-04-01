import { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CanvasRenderer } from "../../components/CanvasRenderer";
import { GameControls } from "../../components/GameControls";
import { GameUI } from "../../components/GameUI";
import { SpaceInvadersUI } from "../../components/SpaceInvadersUI";
import { SpaceInvadersControls } from "../../components/SpaceInvadersControls";
import { FlappyBirdUI } from "../../components/FlappyBirdUI";
import { FlappyBirdControls } from "../../components/FlappyBirdControls";
import { useAsteroidsGame } from "../hooks/useAsteroidsGame";
import { useSpaceInvadersGame } from "../hooks/useSpaceInvadersGame";
import { useFlappyBirdGame } from "../hooks/useFlappyBirdGame";

type GameType = "asteroids" | "space-invaders" | "flappybird";

export default function App() {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);

  if (!selectedGame) {
    return (
      <SafeAreaProvider>
        <View style={styles.menuContainer}>
          <Text style={styles.title}>RETRO ARCADE</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSelectedGame("asteroids")}
          >
            <Text style={styles.menuButtonText}>ASTEROIDES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, { marginTop: 20 }]}
            onPress={() => setSelectedGame("space-invaders")}
          >
            <Text style={styles.menuButtonText}>SPACE INVADERS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, { marginTop: 20 }]}
            onPress={() => setSelectedGame("flappybird")}
          >
            <Text style={styles.menuButtonText}>FLAPPY BIRD</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedGame(null)}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>

        {selectedGame === "asteroids" ? (
          <AsteroidsGameView />
        ) : selectedGame === "space-invaders" ? (
          <SpaceInvadersGameView />
        ) : (
          <FlappyBirdGameView />
        )}
      </View>
    </SafeAreaProvider>
  );
}

function AsteroidsGameView() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useAsteroidsGame();
  const [started, setStarted] = useState(false);

  if (!game) return null;

  if (!started) {
    return <StartScreen title="ASTEROIDES" highScore={highScore} onStart={() => setStarted(true)}
      instructions={Platform.OS === "web" ? "↑ Empujar  ←→ Rotar  Espacio Disparar  Shift Hiperspacio" : "Controles táctiles"} />;
  }

  return (
    <>
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
    </>
  );
}

function SpaceInvadersGameView() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useSpaceInvadersGame();
  const [started, setStarted] = useState(false);

  if (!game) return null;

  if (!started) {
    return <StartScreen title="SPACE INVADERS" highScore={highScore} onStart={() => setStarted(true)}
      instructions={Platform.OS === "web" ? "←→ Mover  Espacio Disparar" : "Controles táctiles"} />;
  }

  return (
    <>
      <SpaceInvadersUI
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
      <SpaceInvadersControls
        onMoveLeft={(pressed) => handleInput({ moveLeft: pressed })}
        onMoveRight={(pressed) => handleInput({ moveRight: pressed })}
        onShoot={(pressed) => handleInput({ shoot: pressed })}
      />
    </>
  );
}

function FlappyBirdGameView() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useFlappyBirdGame();
  const [started, setStarted] = useState(false);

  if (!game) return null;

  if (!started) {
    return <StartScreen title="FLAPPY BIRD" highScore={highScore} onStart={() => setStarted(true)}
      instructions={Platform.OS === "web" ? "Espacio saltar" : "Tocar pantalla para saltar"} />;
  }

  return (
    <>
      <FlappyBirdUI
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
      <FlappyBirdControls
        onFlap={(pressed) => handleInput({ flap: pressed })}
      />
    </>
  );
}

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
    <View style={styles.startScreen}>
      <Text style={styles.title}>{title}</Text>
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
  menuContainer: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
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
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    width: 300,
    alignItems: "center",
  },
  menuButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
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

import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { FlappyBirdUI } from "@/components/FlappyBirdUI";
import { FlappyBirdControls } from "@/components/FlappyBirdControls";
import { useFlappyBirdGame } from "@/hooks/useFlappyBirdGame";
import { useMultiplayer } from "@/multiplayer/useMultiplayer";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { DailyChallengeService } from "@/services/DailyChallengeService";
import { LeaderboardService } from "@/services/LeaderboardService";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";

export default function FlappyBirdScreen() {
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const { game, gameState, handleInput, isPaused, togglePause, highScore, seed, restartWithSeed } = useFlappyBirdGame(isMulti && started);
  const [playerName, setPlayerName] = useState("Jugador");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
  const [showDailyResults, setShowDailyResults] = useState(false);
  const [activeMutators, setActiveMutators] = useState<any[]>([]);

  const { room, connected, serverState } = useMultiplayer("flappybird", playerName, isMulti && started);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("flappybird"));
      }
    });
  }, []);

  const dailySubmittedRef = useRef(false);
  useEffect(() => {
    if (gameState?.isGameOver && isDaily && seed !== undefined && !dailySubmittedRef.current) {
      const score = gameState.score;
      dailySubmittedRef.current = true;
      DailyChallengeService.markAttemptAsUsed("flappybird", score, seed, 0);
      LeaderboardService.submitDailyScore("flappybird", DailyChallengeService.getDateKey(), score, playerName);
      setShowDailyResults(true);
    }
    if (!gameState?.isGameOver) {
      dailySubmittedRef.current = false;
    }
  }, [gameState?.isGameOver, isDaily, seed, gameState?.score, playerName]);

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
        title="FLAPPY BIRD"
        highScore={highScore}
        onStart={() => {
          if (initialSeed !== undefined) {
            restartWithSeed(initialSeed);
          }
          setIsMulti(false);
          setStarted(true);
        }}
        onStartMulti={() => { setIsMulti(true); setStarted(true); }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? "Espacio saltar" : "Tocar pantalla para saltar"}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          restartWithSeed(dailySeed);
          setIsDaily(true);
          setIsMulti(false);
          setStarted(true);
        }}
        activeMutators={activeMutators}
      />
    );
  }

  const handleMultiplayerInput = (input: any) => {
    if (isMulti && room) {
        if (input.flap) room.send("flap");
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

        <FlappyBirdUI
          gameState={gameState}
          onRestart={() => isMulti ? room?.send("start_game") : game.restart()}
          onPause={() => togglePause()}
          isPaused={isPaused}
          highScore={highScore}
          seed={seed}
          onSetSeed={restartWithSeed}
        />
        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />
        <FlappyBirdControls
          onFlap={(pressed) => handleMultiplayerInput({ flap: pressed })}
        />

        {showDailyResults && seed !== undefined && (
          <View style={styles.overlay}>
            <DailyResultsOverlay
              gameId="flappybird"
              score={gameState.score}
              seed={seed}
              onClose={() => setShowDailyResults(false)}
            />
          </View>
        )}
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
  onSeedChange?: (seed: number) => void;
  onStartDaily?: (seed: number) => void;
  activeMutators?: any[];
}> = ({
  title,
  highScore,
  onStart,
  onStartMulti,
  playerName,
  onPlayerNameChange,
  instructions,
  onSeedChange,
  onStartDaily,
  activeMutators = [],
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

        {onStartDaily && <DailyChallengeBanner gameId="flappybird" onPlay={onStartDaily} />}

        <MutatorBadge mutators={activeMutators} />

        {onSeedChange && (
          <SeedWidget
            seed={0}
            onSeedEnter={onSeedChange}
            style={{ marginBottom: 30 }}
          />
        )}

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

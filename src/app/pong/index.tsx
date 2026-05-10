import { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { PongControls } from "@/components/PongControls";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { usePongGame } from "@/hooks/usePongGame";
import { useMultiplayer } from "@/multiplayer/useMultiplayer";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { DailyChallengeService } from "@/services/DailyChallengeService";
import { LeaderboardService } from "@/services/LeaderboardService";
import { PlayerProfileService } from "@/services/PlayerProfileService";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { MULTIPLAYER_CONFIG } from "@/config/MultiplayerConfig";

export default function PongScreen() {
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [playerName, setPlayerName] = useState("Jugador");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"local" | "ai" | "online">("local");
  const [isDaily, setIsDaily] = useState(false);

  // Handle incoming daily challenge parameters
  useEffect(() => {
    if (params.seed && params.isDaily === "true" && !started) {
      const dailySeed = parseInt(params.seed, 10);
      if (!isNaN(dailySeed)) {
        setIsDaily(true);
        setMode("ai");
        setInitialSeed(dailySeed);
        setStarted(true);
      }
    }
  }, [params.seed, params.isDaily, started]);

  // Ensure game starts with the correct seed if set via params
  useEffect(() => {
    if (started && isDaily && initialSeed !== undefined && isReady && game?.getSeed() !== initialSeed) {
        restart(initialSeed);
    }
  }, [started, isDaily, initialSeed, isReady, game]);
  const [showDailyResults, setShowDailyResults] = useState(false);
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  const isMulti = mode === "online";
  const { game, gameState, handleInput, isReady, restart } = usePongGame(started ? mode : null);

  const { room, connected, serverState, localTickRef } = useMultiplayer("pong", playerName, isMulti && started);

  useEffect(() => {
    if (isMulti && serverState && game) {
      (game as any).updateFromServer(serverState);
    }
  }, [isMulti, serverState, game]);

  useEffect(() => {
    if (isMulti && room && started) {
      room.send("ready");
    }
  }, [isMulti, room, started]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("pong"));
      }
    });
  }, []);

  const dailySubmittedRef = useRef(false);
  useEffect(() => {
    if (gameState?.isGameOver && isDaily && game?.getSeed() !== undefined && !dailySubmittedRef.current) {
      const score = Math.max(gameState.scoreP1, gameState.scoreP2);
      const seedVal = game.getSeed()!;
      dailySubmittedRef.current = true;
      DailyChallengeService.markAttemptAsUsed("pong", score, seedVal, 0);
      PlayerProfileService.getProfile().then(profile => {
        LeaderboardService.submitDailyScore(
          "pong",
          DailyChallengeService.getDateKey(),
          score,
          profile.playerId,
          profile.displayName,
          seedVal
        );
      });
      setShowDailyResults(true);
    }
    if (!gameState?.isGameOver) {
      dailySubmittedRef.current = false;
    }
  }, [gameState?.isGameOver, isDaily, game, gameState?.scoreP1, gameState?.scoreP2, playerName]);

  if (!game || !isReady) return null;

  if (!started) {
    return (
      <StartScreen
        title="PONG"
        onStart={(selectedMode) => {
          setMode(selectedMode);
          if (initialSeed !== undefined) {
            restart(initialSeed);
          }
          setStarted(true);
        }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? "P1: W/S  P2: Flechas" : "Modo Local"}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          setInitialSeed(dailySeed);
          setIsDaily(true);
          setMode("ai");
          setStarted(true);
        }}
        activeMutators={activeMutators}
      />
    );
  }

  const handleGameInput = (input: any) => {
      if (isMulti && room) {
          room.send("input", {
              tick: localTickRef.current,
              input: input
          });
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
            <View style={styles.multiOverlay}>
                <Text style={styles.overlayText}>Conectando...</Text>
            </View>
        )}

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
          onP1Up={(pressed) => handleGameInput({ p1Up: pressed })}
          onP1Down={(pressed) => handleGameInput({ p1Down: pressed })}
          onP2Up={(pressed) => { if (mode === "local") handleGameInput({ p2Up: pressed }); }}
          onP2Down={(pressed) => { if (mode === "local") handleGameInput({ p2Down: pressed }); }}
          showP2Controls={mode === "local"}
        />

        <DebugOverlay game={game} />

        {gameState?.isGameOver && !isDaily && (
            <View style={styles.overlay}>
                <Text style={styles.overlayText}>FIN DEL JUEGO</Text>
                <TouchableOpacity style={styles.restartButton} onPress={() => game.restart()}>
                    <Text style={styles.restartButtonText}>REINTENTAR</Text>
                </TouchableOpacity>
            </View>
        )}

        {showDailyResults && game?.getSeed() !== undefined && (
          <View style={styles.overlay}>
            <DailyResultsOverlay
              gameId="pong"
              score={Math.max(gameState?.scoreP1 || 0, gameState?.scoreP2 || 0)}
              seed={game?.getSeed()}
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
  onStart: (mode: "local" | "ai" | "online") => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  instructions: string;
  onSeedChange?: (seed: number) => void;
  onStartDaily?: (seed: number) => void;
  activeMutators?: Mutator[];
}> = ({
  title,
  onStart,
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

        {onStartDaily && <DailyChallengeBanner gameId="pong" onPlay={onStartDaily} />}

        <MutatorBadge mutators={activeMutators} />

        {onSeedChange && (
          <SeedWidget
            seed={initialSeed || 0}
            onSeedEnter={onSeedChange}
            style={{ marginBottom: 30 }}
          />
        )}

        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.startButton} onPress={() => onStart("local")}>
                <Text style={styles.startButtonText}>LOCAL</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity style={styles.startButton} onPress={() => onStart("ai")}>
                <Text style={styles.startButtonText}>VS AI</Text>
            </TouchableOpacity>

            {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
                <>
                    <View style={{ width: 10 }} />
                    <TouchableOpacity style={[styles.startButton, { backgroundColor: '#444' }]} onPress={() => onStart("online")}>
                        <Text style={[styles.startButtonText, { color: 'white' }]}>
                            MULTI {MULTIPLAYER_CONFIG.STATE === 'beta' ? '(BETA)' : ''}
                        </Text>
                    </TouchableOpacity>
                </>
            )}
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
  startButton: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  startButtonText: {
    color: "black",
    fontSize: 16,
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
  multiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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

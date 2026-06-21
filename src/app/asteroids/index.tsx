import { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/components/ComboDisplay";
import { GameUI } from "@/components/GameUI";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useAsteroidsGame } from "@/hooks/useAsteroidsGame";
import { useMultiplayer } from "@/multiplayer/useMultiplayer";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback } from "react";
import { VirtualJoystick } from "../../components/controls/VirtualJoystick";
import { ShootButton } from "../../components/ShootButton";
import { HyperspaceButton } from "../../components/HyperspaceButton";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { DailyChallengeService } from "@/services/DailyChallengeService";
import { LeaderboardService } from "@/services/LeaderboardService";
import { PlayerProfileService } from "@/services/PlayerProfileService";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { AsteroidsGame } from "@/games/asteroids/AsteroidsGame";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { InputState } from "@/games/asteroids/types/AsteroidTypes";
import { MULTIPLAYER_CONFIG } from "@/config/MultiplayerConfig";

export default function AsteroidsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } = useAsteroidsGame(isMulti && started);

  const [playerName, setPlayerName] = useState("Player");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

  // Handle incoming daily challenge parameters
  useEffect(() => {
    if (params.seed && params.isDaily === "true" && !started) {
      const dailySeed = parseInt(params.seed, 10);
      if (!isNaN(dailySeed)) {
        setIsDaily(true);
        setIsMulti(false);
        setInitialSeed(dailySeed);
        setStarted(true);
        // We'll call restartWithSeed once game is ready, or use the initial seed logic in StartScreen
      }
    }
  }, [params.seed, params.isDaily, started]);

  // Ensure game starts with the correct seed if set via params
  useEffect(() => {
    if (started && isDaily && initialSeed !== undefined && isReady && seed !== initialSeed) {
        restartWithSeed(initialSeed);
    }
  }, [started, isDaily, initialSeed, isReady, seed, restartWithSeed]);
  const [showDailyResults, setShowDailyResults] = useState(false);
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  const { room, connected, serverState, sendInput, inputBufferRef } = useMultiplayer("asteroids", playerName, isMulti && started);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("asteroids"));
      }
    });
  }, []);

  const dailySubmittedRef = useRef(false);
  useEffect(() => {
    if (gameState?.isGameOver && isDaily && seed !== undefined && !dailySubmittedRef.current) {
      const score = gameState.score;
      dailySubmittedRef.current = true;
      DailyChallengeService.markAttemptAsUsed("asteroids", score, seed, 0);
      PlayerProfileService.getProfile().then(profile => {
        LeaderboardService.submitDailyScore(
          "asteroids",
          DailyChallengeService.getDateKey(),
          score,
          profile.playerId,
          profile.displayName,
          seed
        );
      });
      setShowDailyResults(true);
    }
    if (!gameState?.isGameOver) {
      dailySubmittedRef.current = false;
    }
  }, [gameState?.isGameOver, isDaily, seed, gameState?.score, playerName]);

  useEffect(() => {
    if (isMulti && connected && game) {
      (game as unknown as AsteroidsGame).setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  useEffect(() => {
    if (isMulti && serverState && game) {
        const sessionId = room?.sessionId;
        const pendingInputs = inputBufferRef.current;

        (game as unknown as AsteroidsGame).updateFromServer(serverState, sessionId);

        // Re-apply pending inputs for reconciliation
        if (sessionId && pendingInputs.length > 0) {
            pendingInputs.forEach(frame => {
                (game as unknown as AsteroidsGame).predictLocalPlayer(frame, 16.66);
            });
        }
    }
  }, [isMulti, serverState, game, room?.sessionId, inputBufferRef]);

  const handleMultiplayerInput = useCallback((input: Partial<InputState>) => {
    if (isMulti && room) {
        const frame = sendInput(input as Record<string, boolean>);
        if (frame) {
            (game as unknown as AsteroidsGame).predictLocalPlayer(frame, 16.66);
        }
    } else {
        handleInput(input);

        // Task 3: Integration with ECS world for touch controls
        // We write the input state to the InputState component of the ship entity.
        // The ECS systems will process this in the next tick.
        const world = game?.getWorld();
        // Finding the player entity (usually tagged as LocalPlayer or simply the Ship entity)
        const localPlayer = world?.query("LocalPlayer" as any)[0];
        if (localPlayer !== undefined && world) {
          world.mutateComponent(localPlayer, "InputState" as any, (inputComp: any) => {
            if (input.thrust !== undefined) inputComp.buttons["thrust"] = input.thrust;
            if (input.shoot !== undefined) inputComp.buttons["shoot"] = input.shoot;
            if (input.rotateLeft !== undefined) inputComp.buttons["left"] = input.rotateLeft;
            if (input.rotateRight !== undefined) inputComp.buttons["right"] = input.rotateRight;
          });
        }
    }
  }, [isMulti, room, sendInput, game, handleInput]);

  const autoFireIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleShootPress = useCallback(() => {
    handleMultiplayerInput({ shoot: true });
    game?.getInputSystem().setOverride("shoot", true);

    // Initial shot
    if (autoFireIntervalRef.current) clearInterval(autoFireIntervalRef.current);

    // Auto-fire logic after 400ms
    autoFireIntervalRef.current = setTimeout(() => {
        autoFireIntervalRef.current = setInterval(() => {
            // Toggle to trigger another shoot action if it's based on state change
            // or just keep it true if the system handles continuous shooting
            game?.getInputSystem().setOverride("shoot", true);
        }, 200); // Shoot every 200ms during auto-fire
    }, 400);

  }, [game, handleMultiplayerInput]);

  const handleShootRelease = useCallback(() => {
    if (autoFireIntervalRef.current) {
        clearTimeout(autoFireIntervalRef.current);
        clearInterval(autoFireIntervalRef.current);
        autoFireIntervalRef.current = null;
    }
    handleMultiplayerInput({ shoot: false });
    game?.getInputSystem().clearOverride("shoot");
  }, [game, handleMultiplayerInput]);

  const handleHyperspacePress = useCallback(() => {
    handleMultiplayerInput({ hyperspace: true });
    game?.getInputSystem().setOverride("hyperspace", true);
  }, [game, handleMultiplayerInput]);

  const handleHyperspaceRelease = useCallback(() => {
    handleMultiplayerInput({ hyperspace: false });
    game?.getInputSystem().clearOverride("hyperspace");
  }, [game, handleMultiplayerInput]);

  if (!started) {
    return (
      <StartScreen
        title={t.menu.asteroids}
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
        instructions={Platform.OS === "web" ? t.asteroids.instructions : t.common.touch_controls}
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

  if (!game || !isReady) return null;

  return (
    <GameErrorBoundary gameId="asteroids">
    <SafeAreaProvider>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← {t.common.menu}</Text>
        </TouchableOpacity>

        {isMulti && !connected && (
            <View style={styles.overlay}>
                <Text style={styles.overlayText}>{t.common.connecting}</Text>
            </View>
        )}

        <ComboDisplay multiplier={gameState?.comboMultiplier || 1} isActive={true} />
        <GameUI
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

        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.leftControlArea} pointerEvents="box-none">
            <VirtualJoystick
              joystickId="movement_joystick"
              type="movement"
              world={game.getWorld()}
            />
          </View>
          <View style={styles.rightControlArea} pointerEvents="box-none">
            <HyperspaceButton
                onPressIn={handleHyperspacePress}
                onPressOut={handleHyperspaceRelease}
            />
            <View style={{ height: 20 }} />
            <ShootButton
                onPressIn={handleShootPress}
                onPressOut={handleShootRelease}
            />
          </View>
        </View>

        <DebugOverlay game={game} />

        {showDailyResults && seed !== undefined && (
          <View style={styles.overlay}>
            <DailyResultsOverlay
              gameId="asteroids"
              score={gameState.score}
              seed={seed}
              onClose={() => setShowDailyResults(false)}
            />
          </View>
        )}
      </View>
    </SafeAreaProvider>
    </GameErrorBoundary>
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
  activeMutators?: Mutator[];
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
  const { t } = useTranslation();
  return (
    <SafeAreaProvider>
      <View style={styles.startScreen}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← {t.common.menu}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>

        <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={onPlayerNameChange}
            placeholder={t.common.your_name}
            placeholderTextColor="#666"
        />

        <Text style={styles.instructions}>{instructions}</Text>
        <Text style={styles.highScoreText}>{t.common.record}: {highScore}</Text>

        {onStartDaily && <DailyChallengeBanner gameId="asteroids" onPlay={onStartDaily} />}

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
                <Text style={styles.startButtonText}>{t.common.solo}</Text>
            </TouchableOpacity>

            {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
                <>
                    <View style={{ width: 20 }} />
                    <TouchableOpacity style={[styles.startButton, { backgroundColor: '#444' }]} onPress={onStartMulti}>
                        <Text style={[styles.startButtonText, { color: 'white' }]}>
                            {t.common.multi}
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
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  leftControlArea: {
    flex: 1,
    height: "100%",
  },
  rightControlArea: {
    width: 150,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    paddingRight: 20,
  }
});

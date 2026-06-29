import { useEffect, useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { FlappyBirdGame } from "../games/flappybird/FlappyBirdGame";
import { MutatorService } from "../services/MutatorService";
import type { Mutator } from "../config/MutatorConfig";
import { INITIAL_FLAPPY_STATE } from "../games/flappybird/types/FlappyBirdTypes";
import type { FlappyBirdState, FlappyBirdInput } from "../games/flappybird/types/FlappyBirdTypes";

/**
 * Custom hook to manage the lifecycle of the Flappy Bird game engine.
 */
export function useFlappyBirdGame(isMultiplayer: boolean = false) {
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("flappybird"));
      }
    });
  }, []);

  const gameOptions = useMemo(() => ({ activeMutators }), [activeMutators]);

  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<FlappyBirdGame, FlappyBirdState, FlappyBirdInput>(
      FlappyBirdGame,
      isMultiplayer,
      { gameOptions, initialState: INITIAL_FLAPPY_STATE }
    );

  const { highScore, updateHighScore } = useHighScore("flappy-high-score");

  // Update high score when game is over
  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_FLAPPY_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}

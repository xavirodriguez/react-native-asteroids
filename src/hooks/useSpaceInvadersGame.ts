import { useEffect, useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { SpaceInvadersGame } from "../games/space-invaders/SpaceInvadersGame";
import { MutatorService } from "../services/MutatorService";
import type { Mutator } from "../config/MutatorConfig";
import { INITIAL_GAME_STATE } from "../games/space-invaders/types/SpaceInvadersTypes";
import type { GameStateComponent, InputState } from "../games/space-invaders/types/SpaceInvadersTypes";

/**
 * Custom hook to manage the lifecycle of the Space Invaders game engine.
 * @param isMultiplayer - Whether to start in multiplayer mode.
 * @param seed - Optional seed intended to support reproducible gameplay.
 */
export function useSpaceInvadersGame(isMultiplayer: boolean = false, seed?: number) {
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("spaceinvaders"));
      }
    });
  }, []);

  const gameOptions = useMemo(() => ({ activeMutators }), [activeMutators]);

  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<SpaceInvadersGame, GameStateComponent, InputState>(
      SpaceInvadersGame,
      isMultiplayer,
      { gameOptions, initialState: INITIAL_GAME_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("space-invaders-high-score");

  // Update high score when game is over
  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_GAME_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}

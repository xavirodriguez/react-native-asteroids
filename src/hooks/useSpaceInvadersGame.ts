import { useEffect } from "react";
import { useGame } from "./useGame";
import { useHighScore } from "./useHighScore";
import { SpaceInvadersGame } from "../games/space-invaders/SpaceInvadersGame";
import { INITIAL_GAME_STATE } from "../games/space-invaders/types/SpaceInvadersTypes";
import type { GameStateComponent, InputState } from "../games/space-invaders/types/SpaceInvadersTypes";

/**
 * Custom hook to manage the lifecycle of the Space Invaders game engine.
 */
export function useSpaceInvadersGame(isMultiplayer: boolean = false) {
  const { game, gameState, isPaused, handleInput, togglePause, restart } =
    useGame<SpaceInvadersGame, GameStateComponent, InputState>(SpaceInvadersGame, INITIAL_GAME_STATE, isMultiplayer);

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
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}

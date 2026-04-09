import { useEffect } from "react";
import { useGame } from "./useGame";
import { useHighScore } from "./useHighScore";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";
import { INITIAL_GAME_STATE } from "../types/GameTypes";
import type { GameStateComponent, InputState } from "../types/GameTypes";

/**
 * Custom hook to manage the lifecycle of the Asteroids game engine.
 */
export function useAsteroidsGame(isMultiplayer: boolean = false) {
  const { game, gameState, isPaused, handleInput, togglePause, restartWithSeed } =
    useGame<AsteroidsGame, GameStateComponent, InputState>(AsteroidsGame, INITIAL_GAME_STATE, isMultiplayer);

  const { highScore, updateHighScore } = useHighScore();

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
    restartWithSeed
  };
}

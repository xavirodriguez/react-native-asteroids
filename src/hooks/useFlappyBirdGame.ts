import { useEffect } from "react";
import { useGame } from "./useGame";
import { useHighScore } from "./useHighScore";
import { FlappyBirdGame } from "../games/flappybird/FlappyBirdGame";
import { INITIAL_FLAPPY_STATE } from "../games/flappybird/types/FlappyBirdTypes";
import type { FlappyBirdState, FlappyBirdInput } from "../games/flappybird/types/FlappyBirdTypes";

/**
 * Custom hook to manage the lifecycle of the Flappy Bird game engine.
 */
export function useFlappyBirdGame(isMultiplayer: boolean = false) {
  const { game, gameState, isPaused, handleInput, togglePause, restartWithSeed } =
    useGame<FlappyBirdGame, FlappyBirdState, FlappyBirdInput>(FlappyBirdGame, INITIAL_FLAPPY_STATE, isMultiplayer);

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
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed
  };
}

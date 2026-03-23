import { useEffect, useState, useCallback } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";
import { type GameStateComponent, INITIAL_GAME_STATE, type InputState } from "../types/GameTypes";
import { useHighScore } from "./useHighScore";
import { useGame } from "./useGame";

/**
 * Custom hook to manage the lifecycle of the Asteroids game engine.
 * Specialized instance of the generic useGame hook.
 */
export function useAsteroidsGame() {
  const { game, isPaused, handleInput } = useGame(AsteroidsGame);
  const [gameState, setGameState] = useState<GameStateComponent>(INITIAL_GAME_STATE);
  const { highScore, updateHighScore } = useHighScore();

  useEffect(() => {
    activateKeepAwakeAsync();
    const unsubscribe = game.subscribe((updatedGame) => {
      const state = updatedGame.getGameState();
      setGameState(state);
      if (state.isGameOver) {
        updateHighScore(state.score);
      }
    });

    return () => {
      unsubscribe();
      deactivateKeepAwake();
    };
  }, [game, updateHighScore]);

  const togglePause = useCallback(() => {
    game.isPausedState() ? game.resume() : game.pause();
  }, [game]);

  return { game, gameState, handleInput, isPaused, togglePause, highScore };
}

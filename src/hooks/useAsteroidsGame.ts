import { useEffect, useState, useCallback } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { AsteroidsGame, NullAsteroidsGame } from "../game/AsteroidsGame";
import { type IAsteroidsGame } from "../game/types/GameInterfaces";
import { type GameStateComponent, INITIAL_GAME_STATE, type InputState } from "../types/GameTypes";
import { useHighScore } from "./useHighScore";

/**
 * Custom hook to manage the lifecycle of the Asteroids game engine.
 *
 * @returns An object containing the game instance, current state, and input handler.
 */
export function useAsteroidsGame() {
  const [game, setGame] = useState<IAsteroidsGame>(new NullAsteroidsGame());
  const [gameState, setGameState] = useState<GameStateComponent>(INITIAL_GAME_STATE);
  const [isPaused, setIsPaused] = useState(false);
  const { highScore, updateHighScore } = useHighScore();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    activateKeepAwakeAsync();
    const newGame = new AsteroidsGame();
    setGame(newGame);
    newGame.start();

    const unsubscribe = newGame.subscribe((updatedGame) => {
      const state = updatedGame.getGameState();
      setGameState(state);
      setIsPaused(updatedGame.isPausedState());
      if (state.isGameOver) {
        updateHighScore(state.score);
      }
      forceUpdate({});
    });

    return () => {
      unsubscribe();
      newGame.destroy();
      deactivateKeepAwake();
    };
  }, []);

  const handleInput = useCallback(
    (input: Partial<InputState>) => {
      game.setInput(input);
    },
    [game]
  );

  const togglePause = useCallback(() => {
    if (game.isPausedState()) {
      game.resume();
    } else {
      game.pause();
    }
  }, [game]);

  return { game, gameState, handleInput, isPaused, togglePause, highScore };
}

import { useEffect, useState, useCallback } from "react";
import { type IAsteroidsGame, AsteroidsGame, NullAsteroidsGame } from "../game/AsteroidsGame";
import { type GameStateComponent, INITIAL_GAME_STATE, type InputState } from "../types/GameTypes";

/**
 * Custom hook to manage the lifecycle of the Asteroids game engine.
 *
 * @returns An object containing the game instance, current state, and input handler.
 */
export function useAsteroidsGame() {
  const [game, setGame] = useState<IAsteroidsGame>(new NullAsteroidsGame());
  const [gameState, setGameState] = useState<GameStateComponent>(INITIAL_GAME_STATE);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const newGame = new AsteroidsGame();
    setGame(newGame);
    newGame.start();

    const unsubscribe = newGame.subscribe((updatedGame) => {
      setGameState(updatedGame.getGameState());
      forceUpdate({});
    });

    return () => {
      unsubscribe();
      newGame.destroy();
    };
  }, []);

  const handleInput = useCallback(
    (input: Partial<InputState>) => {
      game.setInput(input);
    },
    [game]
  );

  return { game, gameState, handleInput };
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { BaseGame } from "../engine/BaseGame";
import { InputState } from "../types/GameTypes";

export interface UseGameResult<T extends BaseGame> {
  game: T;
  isPaused: boolean;
  handleInput: (input: Partial<InputState>) => void;
}

/**
 * Generic hook to manage the lifecycle and state of any game extending BaseGame.
 */
export function useGame<T extends BaseGame>(GameClass: new () => T): UseGameResult<T> {
  const game = useMemo(() => new GameClass(), [GameClass]);
  const [isPaused, setIsPaused] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    game.start();
    const unsubscribe = game.subscribe((g) => {
      setIsPaused(g.isPausedState());
      setTick((t) => t + 1); // Trigger React update for external consumers
    });

    return () => {
      game.destroy();
      unsubscribe();
    };
  }, [game]);

  const handleInput = useCallback((input: Partial<InputState>) => {
    game.setInput(input);
  }, [game]);

  return { game, isPaused, handleInput };
}

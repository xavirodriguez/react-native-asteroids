import { useEffect, useState, useCallback, useRef } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { BaseGame } from "../engine/core/BaseGame";

// Constructor type - accepts any class that extends BaseGame
type GameConstructor<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, boolean>> =
  new () => TGame;

export interface UseGameResult<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, boolean>> {
  game: TGame;
  gameState: TState | null;
  isPaused: boolean;
  handleInput: (input: Partial<TInput>) => void;
  togglePause: () => void;
}

/**
 * Generic hook to manage game lifecycle and state in React.
 */
export function useGame<
  TGame extends BaseGame<TState, TInput>,
  TState,
  TInput extends Record<string, boolean>
>(
  GameClass: GameConstructor<TGame, TState, TInput>,
  initialState: TState | null = null
): UseGameResult<TGame, TState, TInput> {

  // useRef so the instance is not recreated on every render
  const gameRef = useRef<TGame | null>(null);
  const [gameState, setGameState] = useState<TState | null>(initialState);
  const [isPaused, setIsPaused] = useState(false);
  const [, forceUpdate] = useState(0);

  // Optimization: Throttle React state updates to 15 FPS to prevent bridge saturation
  const lastUpdateTimeRef = useRef<number>(0);
  const lastPausedRef = useRef<boolean>(false);
  const THROTTLE_MS = 1000 / 15;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {});
    const game = new GameClass();
    gameRef.current = game;
    game.start();

    const flush = (updatedGame: TGame) => {
      const paused = updatedGame.isPausedState();
      setGameState(updatedGame.getGameState() as TState);
      setIsPaused(paused);
      lastPausedRef.current = paused;
      forceUpdate((v) => v + 1);
      lastUpdateTimeRef.current = performance.now();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const unsubscribe = game.subscribe((updatedGame) => {
      const now = performance.now();
      const currentState = updatedGame.getGameState() as any;
      const isGameOver = currentState?.isGameOver === true;
      const paused = updatedGame.isPausedState();

      // Critical state changes (Pause, Game Over) bypass the throttle
      // Use ref to avoid stale closure of React state 'isPaused'
      const isCriticalChange = paused !== lastPausedRef.current || isGameOver;

      if (isCriticalChange || now - lastUpdateTimeRef.current >= THROTTLE_MS) {
        flush(updatedGame as TGame);
      } else {
        // Schedule a deferred update to ensure the final state is eventually delivered
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => flush(updatedGame as TGame), THROTTLE_MS);
        }
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      game.destroy();
      deactivateKeepAwake();
    };
  // GameClass is stable, and we use refs for mutable state in the subscription.
  }, []);

  const handleInput = useCallback((input: Partial<TInput>) => {
    gameRef.current?.setInput(input);
  }, []);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (!game) {
      return;
    }
    if (game.isPausedState()) {
      game.resume();
    } else {
      game.pause();
    }
  }, []);

  return {
    game: gameRef.current as TGame,
    gameState,
    isPaused,
    handleInput,
    togglePause,
  };
}

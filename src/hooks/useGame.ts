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
  const gameStateRef = useRef<TState | null>(initialState);
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

    let lastUpdateTime = 0;
    const UI_UPDATE_INTERVAL = 1000 / 15; // Throttled to 15 FPS for UI components

    const unsubscribe = game.subscribe((updatedGame) => {
      const state = updatedGame.getGameState() as TState;
      gameStateRef.current = state;

      const now = performance.now();
      const isPausedNow = updatedGame.isPausedState();
      if (isPausedNow !== isPaused || now - lastUpdateTime >= UI_UPDATE_INTERVAL) {
        setGameState(state);
        setIsPaused(isPausedNow);
        forceUpdate((v) => v + 1);
        lastUpdateTime = now;
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

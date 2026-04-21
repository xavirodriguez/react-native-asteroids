import { useEffect, useState, useCallback, useRef } from "react";
import { useKeepAwake } from "./useKeepAwake";
import type { BaseGame } from "../engine/core/BaseGame";

// Constructor type - accepts any class that extends BaseGame
type GameConstructor<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, any>> =
  new (config: { isMultiplayer?: boolean, seed?: number }) => TGame;

export interface UseGameResult<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, boolean>> {
  game: TGame | null;
  gameState: TState | null;
  isPaused: boolean;
  isReady: boolean;
  handleInput: (input: Partial<TInput>) => void;
  togglePause: () => void;
  restart: (seed?: number) => void;
}

/**
 * Hook genérico para gestionar el ciclo de vida y el estado de un juego en React.
 *
 * @remarks
 * Este hook es el puente oficial entre el motor ECS (imperativo) y React (declarativo).
 * Se encarga de la inicialización asíncrona, el arranque del loop, la suscripción
 * a cambios de estado y la limpieza de recursos al desmontar el componente.
 *
 * @responsibility Orquestar el ciclo de vida del motor dentro de un componente React.
 * @responsibility Sincronizar el estado de simulación con el estado de React de forma throttled.
 * @responsibility Proveer callbacks estables para el control de entrada y pausa.
 *
 * @param GameClass - Constructor de la clase de juego que extiende {@link BaseGame}.
 * @param initialState - Estado inicial para el hook antes de la carga del motor.
 * @param isMultiplayer - Flag para habilitar el modo de red.
 *
 * @returns Un objeto {@link UseGameResult} con el motor, el estado y métodos de control.
 *
 * @conceptualRisk [REACT_RE_RENDER][MEDIUM] Actualizar el estado de React en cada frame
 * de simulación (60Hz) es costoso. Este hook utiliza un intervalo de actualización de
 * UI (15 FPS por defecto) para optimizar el rendimiento.
 * @conceptualRisk [ASYNC_INIT][HIGH] El acceso a `game` será `null` hasta que la promesa
 * de `init()` se resuelva. Los componentes UI deben manejar este estado inicial.
 * @conceptualRisk [LIFECYCLE_LEAK][LOW] Si no se llama a `game.destroy()` (gestionado
 * automáticamente por el hook), el loop y los listeners de entrada persistirán.
 */
export function useGame<
  TGame extends BaseGame<TState, TInput>,
  TState,
  TInput extends Record<string, boolean>
>(
  GameClass: GameConstructor<TGame, TState, TInput>,
  initialState: TState | null = null,
  isMultiplayer: boolean = false
): UseGameResult<TGame, TState, TInput> {

  const [game, setGame] = useState<TGame | null>(null);
  const [isReady, setIsReady] = useState(false);
  const gameStateRef = useRef<TState | null>(initialState);
  const [gameState, setGameState] = useState<TState | null>(initialState);
  const [isPaused, setIsPaused] = useState(false);
  const [, forceUpdate] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Principle 4: Use encapsulated hook for symmetric resource management
  useKeepAwake(!isPaused && isReady);

  useEffect(() => {
    let isMounted = true;
    const gameInstance = new GameClass({ isMultiplayer });
    setIsReady(false);

    // Async initialization
    gameInstance.init().then(() => {
      if (isMounted) {
        gameInstance.start();
        setGame(gameInstance);
        setIsReady(true);
      }
    }).catch(console.error);

    let lastUpdateTime = 0;
    const UI_UPDATE_INTERVAL = 1000 / 15; // Throttled to 15 FPS for UI components

    const unsubscribe = gameInstance.subscribe((updatedGame) => {
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
      isMounted = false;
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      gameInstance.destroy();
    };
  // Re-initialize if multiplayer mode or game class changes
  }, [GameClass, isMultiplayer]);

  const handleInput = useCallback((input: Partial<TInput>) => {
    if (game && isReady) {
      game.setInput(input as Record<string, boolean>);
    }
  }, [game, isReady]);

  const togglePause = useCallback(() => {
    if (game && isReady) {
      if (game.isPausedState()) {
        game.resume();
      } else {
        game.pause();
      }
    }
  }, [game, isReady]);

  const restart = useCallback((seed?: number) => {
    if (game && isReady) {
      game.restart(seed).catch(console.error);
    }
  }, [game, isReady]);

  return {
    game,
    gameState,
    isPaused,
    isReady,
    handleInput,
    togglePause,
    restart,
  };
}

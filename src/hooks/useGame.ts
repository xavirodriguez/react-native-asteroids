import { useEffect, useState, useCallback, useRef } from "react";
import { useKeepAwake } from "./useKeepAwake";
import type { BaseGame } from "../engine/core/BaseGame";
import type { DebugManager } from "../engine/debug/DebugManager";

// Constructor type - accepts any class that extends BaseGame
type GameConstructor<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, unknown>> =
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
 * Hook genérico para gestionar el ciclo de vida del juego y su estado en componentes React.
 *
 * @remarks
 * Facilita la integración entre el motor ECS (síncrono/fixed-step) y el sistema de renderizado
 * de React (asíncrono/bajo demanda).
 *
 * ### Responsabilidades:
 * 1. **Inicialización Asíncrona**: Ejecuta `game.init()` y `game.start()` de forma segura.
 * 2. **Throttling de UI**: Limita las actualizaciones del estado de React a 15 FPS para
 *    evitar sobrecargar el hilo principal con datos de simulación de alta frecuencia.
 * 3. **Gestión de Recursos**: Asegura que `game.destroy()` se llame al desmontar el componente,
 *    previniendo fugas de memoria (timers, event listeners).
 * 4. **Keep Awake**: Mantiene la pantalla encendida mientras el juego está activo.
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
  const isPausedRef = useRef(false);
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
      if (isPausedNow !== isPausedRef.current || now - lastUpdateTime >= UI_UPDATE_INTERVAL) {
        isPausedRef.current = isPausedNow;
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
    game?.setInput(input as Record<string, boolean>);
  }, [game]);

  const togglePause = useCallback(() => {
    if (!game) {
      return;
    }
    if (game.isPausedState()) {
      game.resume();
    } else {
      game.pause();
    }
  }, [game]);

  const restart = useCallback((seed?: number) => {
    game?.restart(seed).catch(console.error);
  }, [game]);

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

/**
 * Hook to manage the DebugManager lifecycle.
 */
export function useDebugManager(game: BaseGame<any, any> | null): DebugManager | null {
  const [manager, setManager] = useState<DebugManager | null>(null);

  useEffect(() => {
    if (!game || !__DEV__) {
      setManager(null);
      return;
    }

    const { DebugManager: DebugManagerClass } = require("../engine/debug/DebugManager");
    const debugManager = DebugManagerClass.getInstance();
    debugManager.attach(game);
    setManager(debugManager);

    return () => {
      debugManager.detach();
    };
  }, [game]);

  return manager;
}

const __DEV__ = process.env.NODE_ENV !== "production";

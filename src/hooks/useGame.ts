import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useKeepAwake } from "./useKeepAwake";
import type { BaseGame, BaseGameConfig } from "../engine/core/BaseGame";
import type { DebugManager } from "../engine/debug/DebugManager";

export type GameConfig = BaseGameConfig & {
  seed?: number;
  gameOptions?: Record<string, unknown>;
};

export interface GameOptions<TState> {
  seed?: number;
  gameOptions?: Record<string, unknown>;
  initialState?: TState | null;
}

// Constructor type - accepts any class that extends BaseGame
type GameConstructor<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, unknown>> =
  new (config: GameConfig) => TGame;

export interface UseGameResult<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, unknown>> {
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
  TInput extends Record<string, unknown>
>(
  GameClass: GameConstructor<TGame, TState, TInput> | null,
  isMultiplayer: boolean = false,
  options: GameOptions<TState> = {}
): UseGameResult<TGame, TState, TInput> {
  const { seed, gameOptions, initialState = null } = options;

  const config = useMemo(() => ({
    isMultiplayer,
    seed,
    gameOptions: { ...gameOptions, seed: seed ?? (gameOptions?.seed as number | undefined) }
  }), [isMultiplayer, seed, gameOptions]);

  const [game, setGame] = useState<TGame | null>(null);
  const [isReady, setIsReady] = useState(false);
  const gameStateRef = useRef<TState | null>(initialState);
  const [gameState, setGameState] = useState<TState | null>(initialState);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Principle 4: Use encapsulated hook for symmetric resource management
  useKeepAwake(!isPaused && isReady);

  useEffect(() => {
    if (!GameClass) {
      setGame(null);
      setIsReady(false);
      setGameState(initialState);
      gameStateRef.current = initialState;
      return;
    }

    let isMounted = true;
    const gameInstance = new GameClass(config);
    setIsReady(false);

    // Async initialization
    if (isMounted) {
      gameInstance.init().then(() => {
        if (isMounted) {
          gameInstance.start();
          setGame(gameInstance);
          setIsReady(true);
        }
      }).catch((err) => {
        if (isMounted) console.error(err);
      });
    }

    let lastUpdateTime = 0;
    const UI_UPDATE_INTERVAL = 1000 / 15; // Throttled to 15 FPS for UI components

    const unsubscribe = gameInstance.subscribe((state) => {
      gameStateRef.current = state as TState;

      const now = performance.now();
      const isPausedNow = gameInstance.isPausedState();
      if (isPausedNow !== isPausedRef.current || now - lastUpdateTime >= UI_UPDATE_INTERVAL) {
        isPausedRef.current = isPausedNow;
        // Spread to help ensure a new object reference for React reconciliation.
        setGameState({ ...(state as TState) });
        setIsPaused(isPausedNow);
        lastUpdateTime = now;
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      gameInstance.destroy();
    };
  // Re-initialize if game class or config change
  }, [GameClass, config, initialState]);

  const handleInput = useCallback((input: Partial<TInput>) => {
    if (!game) return;
    Object.entries(input).forEach(([action, pressed]) => {
      game.getInputSystem().setOverride(action, !!pressed);
    });
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
export function useDebugManager(game: BaseGame<Record<string, unknown>, Record<string, boolean>> | null): DebugManager | null {
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

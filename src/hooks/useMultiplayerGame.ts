import { useEffect, useState, useCallback, useRef } from "react";
import { activateKeepAwakeAsync } from "expo-keep-awake";
import { Client, Room } from "colyseus.js";
import type { BaseGame } from "../engine/core/BaseGame";

// Constructor type - accepts any class that extends BaseGame
type GameConstructor<TGame extends BaseGame<TState, TInput>, TState, TInput extends Record<string, boolean>> =
  new () => TGame;

export interface UseMultiplayerGameResult<TState, TInput extends Record<string, boolean>> {
  gameState: TState | null;
  isPaused: boolean;
  handleInput: (input: Partial<TInput>) => void;
  togglePause: () => void;
  connected: boolean;
}

/**
 * Generic hook to manage multiplayer game lifecycle and state in React using Colyseus.
 */
export function useMultiplayerGame<
  TGame extends BaseGame<TState, TInput>,
  TState,
  TInput extends Record<string, boolean>
>(
  GameClass: GameConstructor<TGame, TState, TInput>,
  initialState: TState | null = null
): UseMultiplayerGameResult<TState, TInput> {

  const [gameState, setGameState] = useState<TState | null>(initialState);
  const [isPaused, setIsPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {});

    // Connect to the Colyseus server
    const client = new Client("ws://127.0.0.1:2567");

    async function connect() {
      try {
        const room = await client.joinOrCreate("asteroids");
        roomRef.current = room;
        setConnected(true);

        room.onStateChange((state) => {
          // [ASUMO: El estado del servidor se mapea directamente al TState del juego]
          setGameState(state as unknown as TState);
        });

        room.onLeave((code) => {
          console.log("Left room with code:", code);
          setConnected(false);
        });
      } catch (e) {
        console.error("Failed to connect to multiplayer server:", e);
      }
    }

    connect();

    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
  }, []);

  const handleInput = useCallback((input: Partial<TInput>) => {
    if (roomRef.current && connected) {
      roomRef.current.send("input", input);
    }
  }, [connected]);

  const togglePause = useCallback(() => {
    // In multiplayer, pausing usually happens via a server message or is disabled
    setIsPaused(!isPaused);
  }, [isPaused]);

  return {
    gameState,
    isPaused,
    handleInput,
    togglePause,
    connected,
  };
}

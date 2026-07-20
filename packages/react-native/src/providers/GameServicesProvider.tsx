import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useKeepAwake } from "../hooks/useKeepAwake";

/**
 * Adapter interface for the audio settings service.
 * Decouples the React Native core package from the client-specific persistence implementation.
 * @public
 */
export interface AudioServiceAdapter {
  /** Gets the current muted state. */
  isMuted(): boolean;
  /** Sets the muted state and returns a promise that resolves when persisted. */
  setMuted(muted: boolean): Promise<void>;
  /** Toggles the muted state and returns the new state. */
  toggleMute(): Promise<boolean>;
  /** Subscribes to muted state changes and returns an unsubscribe function. */
  subscribe(listener: (muted: boolean) => void): () => void;
}

/**
 * React Context value for game services.
 * @public
 */
export interface GameServicesContextType {
  /** The current mute state of the audio. */
  isMuted: boolean;
  /** Toggles the global audio mute state. */
  toggleMute: () => Promise<void>;
  /** Explicitly sets the global audio mute state. */
  setMuted: (muted: boolean) => Promise<void>;
  /** Registers/updates a keep-awake request. If any request is active, keep-awake is enabled. */
  requestKeepAwake: (id: string, active: boolean) => void;
  /** Whether the keep-awake system is currently active. */
  isKeepAwakeActive: boolean;
}

const GameServicesContext = createContext<GameServicesContextType | null>(null);

/**
 * Provider component to centralize and orchestrate Game Services (Audio & KeepAwake).
 * Wraps the application to project service states reactively.
 *
 * @param props - Component properties.
 * @public
 */
export function GameServicesProvider({
  audioService,
  children,
}: {
  audioService: AudioServiceAdapter;
  children: React.ReactNode;
}) {
  const [isMuted, setIsMuted] = useState<boolean>(() => audioService.isMuted());
  const [keepAwakeRequests, setKeepAwakeRequests] = useState<Record<string, boolean>>({});

  // Subscribe to external audio service updates
  useEffect(() => {
    const unsubscribe = audioService.subscribe((muted) => {
      setIsMuted(muted);
    });
    return unsubscribe;
  }, [audioService]);

  const toggleMute = useCallback(async () => {
    await audioService.toggleMute();
  }, [audioService]);

  const setMuted = useCallback(async (muted: boolean) => {
    await audioService.setMuted(muted);
  }, [audioService]);

  const requestKeepAwake = useCallback((id: string, active: boolean) => {
    setKeepAwakeRequests((prev) => {
      if (prev[id] === active) return prev;
      return { ...prev, [id]: active };
    });
  }, []);

  const isKeepAwakeActive = useMemo(() => {
    return Object.values(keepAwakeRequests).some((v) => v);
  }, [keepAwakeRequests]);

  // Activate KeepAwake at the root provider based on aggregated requests
  useKeepAwake(isKeepAwakeActive);

  const contextValue = useMemo<GameServicesContextType>(
    () => ({
      isMuted,
      toggleMute,
      setMuted,
      requestKeepAwake,
      isKeepAwakeActive,
    }),
    [isMuted, toggleMute, setMuted, requestKeepAwake, isKeepAwakeActive]
  );

  return (
    <GameServicesContext.Provider value={contextValue}>
      {children}
    </GameServicesContext.Provider>
  );
}

/**
 * Custom hook to safely consume the central GameServicesContext.
 *
 * @returns The central game services context, or null if used outside of a GameServicesProvider.
 * @public
 */
export function useGameServices(): GameServicesContextType | null {
  return useContext(GameServicesContext);
}

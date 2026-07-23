/**
 * React hook for managing multiplayer connectivity and state synchronization.
 *
 * This hook encapsulates the complexity of connecting to Colyseus rooms,
 * handling server messages, and notifying the React component tree of state updates.
 *
 * @packageDocumentation
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { ColyseusTransport } from "@tiny-aster/network-colyseus";
import { Room } from "@colyseus/sdk";
import { InputFrame, BinaryCompression } from "@tiny-aster/core";

/**
 * Manages the network lifecycle for a game session.
 *
 * @param roomName - The name of the game room to join.
 * @param playerName - Display name for the player.
 * @param active - If false, the hook will disconnect and cleanup.
 */
export function useMultiplayer(roomName: string, playerName: string, active: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverState, setServerState] = useState<any>(null);
  const cancelledRef = useRef(false);

  const localTickRef = useRef(0);
  const serverTickRef = useRef(0);
  const lastProcessedTickRef = useRef(0);
  const lastAckedVersionRef = useRef(0);
  const inputBufferRef = useRef<InputFrame[]>([]);

  const persistentInputRef = useRef<{
    thrust: boolean;
    rotateLeft: boolean;
    rotateRight: boolean;
    rotationAmount?: number;
    shoot: boolean;
    hyperspace: boolean;
  }>({
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    rotationAmount: undefined,
    shoot: false,
    hyperspace: false,
  });

  useEffect(() => {
    if (!active || !playerName) return;

    cancelledRef.current = false;
    const connection = new ColyseusTransport(roomName, { name: playerName });

    async function setup() {
      try {
        const endpoint = process.env.EXPO_PUBLIC_COLYSEUS_URL ?? "ws://127.0.0.1:2567";
        await connection.connect(endpoint);
        const joinedRoom = connection.getRoom();
        if (cancelledRef.current) {
          connection.disconnect();
          return;
        }

        if (!joinedRoom) return;

        setRoom(joinedRoom);
        setConnected(true);
        setServerState(joinedRoom.state);

        joinedRoom.onStateChange((state: any) => {
          setServerState({ ...state }); // Spread ensures React re-renders even if object reference is reused
          if (state.serverTick) {
            serverTickRef.current = state.serverTick;
          }
          if (state.lastProcessedTick) {
            lastProcessedTickRef.current = state.lastProcessedTick;
            // Clear old inputs from buffer
            inputBufferRef.current = inputBufferRef.current.filter(f => f.tick > state.lastProcessedTick);
          }
        });

        /**
         * Clock Synchronization & Latency Estimation.
         *
         * @remarks
         * Calculates the Round Trip Time (RTT) to align the local simulation tick with the server.
         * The client maintains a "lead" (temporal offset) relative to the server to ensure that
         * its input frames arrive at the backend BEFORE the server attempts to process that tick.
         *
         * ### Synchronization Formula:
         * `Local Tick = Server Tick + (RTT / 2 / FrameDuration) + TICK_BUFFER`
         *
         * - **RTT / 2**: Estimated one-way latency (ms).
         * - **FrameDuration**: 16.66ms for 60 FPS target.
         * - **TICK_BUFFER**: Safety margin (2 frames) to absorb network Jitter.
         */
        joinedRoom.onMessage("sync_tick", (data: { serverTick: number, timestamp: number }) => {
            const now = Date.now();
            const rtt = now - data.timestamp;
            // 16.66ms is the duration of a 60fps frame.
            const FRAME_DURATION = 16.66;
            // Buffer of 2 frames to account for jitter.
            const TICK_BUFFER = 2;

            localTickRef.current = data.serverTick + Math.ceil((rtt / 2) / FRAME_DURATION) + TICK_BUFFER;
            console.log(`Synced tick: server=${data.serverTick}, local=${localTickRef.current}, rtt=${rtt}`);
        });

        /**
         * Handles JSON-based delta state updates.
         * Extracts the world state version for acknowledgment.
         */
        joinedRoom.onMessage("world_delta", (data: { tick: number, delta: string }) => {
            if (data.tick <= lastProcessedTickRef.current) return;
            try {
                const deltaObj = JSON.parse(data.delta);
                let versionChanged = false;
                if (deltaObj.stateVersion !== undefined && deltaObj.stateVersion !== lastAckedVersionRef.current) {
                    lastAckedVersionRef.current = deltaObj.stateVersion;
                    versionChanged = true;
                }
                // Forward parsed delta to avoid double parsing in the game
                setServerState({ delta: deltaObj, tick: data.tick });

                // Acknowledge version if it changed
                if (versionChanged) {
                    joinedRoom.send("sync_tick", {
                        timestamp: Date.now(),
                        lastAckedVersion: lastAckedVersionRef.current
                    });
                }
            } catch (e) {
                console.error("[useMultiplayer] Failed to parse world_delta:", e);
            }
        });

        joinedRoom.onMessage("world_delta_bin", (data: Uint8Array) => {
            try {
                const deltaPacket = BinaryCompression.unpack<{ tick?: number, stateVersion?: number }>(data);
                if (deltaPacket.tick !== undefined && deltaPacket.tick <= lastProcessedTickRef.current) return;

                let versionChanged = false;
                if (deltaPacket.stateVersion !== undefined && deltaPacket.stateVersion !== lastAckedVersionRef.current) {
                    lastAckedVersionRef.current = deltaPacket.stateVersion;
                    versionChanged = true;
                }
                setServerState({ delta: deltaPacket, tick: deltaPacket.tick || serverTickRef.current });

                if (versionChanged) {
                    joinedRoom.send("sync_tick", {
                        timestamp: Date.now(),
                        lastAckedVersion: lastAckedVersionRef.current
                    });
                }
            } catch (e) {
                console.error("[useMultiplayer] Failed to unpack binary delta:", e);
            }
        });

        joinedRoom.send("sync_tick", {
            protocolVersion: 1,
            timestamp: Date.now(),
            lastAckedVersion: lastAckedVersionRef.current
        });

        joinedRoom.onLeave((_code: any) => {
          setConnected(false);
          setRoom(null);
        });

      } catch (e) {
        console.error("Failed to connect to multiplayer room:", e);
      }
    }

    setup();

    return () => {
      cancelledRef.current = true;
      connection.disconnect();
      setConnected(false);
      setRoom(null);
    };
  }, [roomName, playerName, active]);

  const sendInput = useCallback((input: Partial<typeof persistentInputRef.current>) => {
    if (!room || !connected) return null;

    // 1. Merge: las propiedades continuas se sobreescriben solo si vienen explícitas
    //    Las discretas (shoot, hyperspace) se acumulan con OR para no perderse
    persistentInputRef.current = {
        thrust:         input.thrust         ?? persistentInputRef.current.thrust,
        rotateLeft:     input.rotateLeft     ?? persistentInputRef.current.rotateLeft,
        rotateRight:    input.rotateRight    ?? persistentInputRef.current.rotateRight,
        rotationAmount: input.rotationAmount ?? persistentInputRef.current.rotationAmount,
        // Discretas: true si ya estaba activo O si llega ahora
        shoot:          (persistentInputRef.current.shoot      || !!input.shoot),
        hyperspace:     (persistentInputRef.current.hyperspace || !!input.hyperspace),
    };

    if (localTickRef.current % 10 === 0) {
        room.send("sync_tick", {
            protocolVersion: 1,
            timestamp: Date.now(),
            lastAckedVersion: lastAckedVersionRef.current
        });
    }

    localTickRef.current++;
    const merged = persistentInputRef.current;

    const actions: string[] = [];
    if (merged.thrust)      actions.push("thrust");
    if (merged.rotateLeft)  actions.push("rotateLeft");
    if (merged.rotateRight) actions.push("rotateRight");
    if (merged.shoot)       actions.push("shoot");
    if (merged.hyperspace)  actions.push("hyperspace");

    const frame: InputFrame = {
        protocolVersion: 1,
        tick: localTickRef.current,
        timestamp: Date.now(),
        actions,
        axes: {
            thrust:       merged.thrust ? 1 : 0,
            rotate_left:  merged.rotateLeft ? 1 : 0,
            rotate_right: merged.rotateRight ? 1 : 0,
            rotate_x:     merged.rotationAmount
                            ?? (merged.rotateLeft ? -1 : merged.rotateRight ? 1 : 0),
        }
    };

    room.send("input", frame);
    inputBufferRef.current.push(frame);
    if (inputBufferRef.current.length > 120) inputBufferRef.current.shift();

    // 2. Limpiar SOLO las acciones discretas tras enviar el frame
    persistentInputRef.current.shoot      = false;
    persistentInputRef.current.hyperspace = false;

    return frame;
  }, [room, connected]);

  return {
    room,
    connected,
    serverState,
    sendInput,
    localTickRef,
    inputBufferRef,
    lastProcessedTickRef
  };
}

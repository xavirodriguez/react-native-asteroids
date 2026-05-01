/**
 * React hook for managing multiplayer connectivity and state synchronization.
 *
 * This hook encapsulates the complexity of connecting to Colyseus rooms,
 * handling server messages, and notifying the React component tree of state updates.
 *
 * @packageDocumentation
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { connectToRoom, disconnect } from "./ColyseusClient";
import { Room } from "@colyseus/sdk";
import { InputFrame } from "./NetTypes";
import { BinaryCompression } from "../engine/network/BinaryCompression";

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
  const [serverState, setServerState] = useState<unknown>(null);
  const cancelledRef = useRef(false);

  const localTickRef = useRef(0);
  const serverTickRef = useRef(0);
  const lastProcessedTickRef = useRef(0);
  const lastAckedVersionRef = useRef(0);
  const inputBufferRef = useRef<InputFrame[]>([]);

  useEffect(() => {
    if (!active || !playerName) return;

    cancelledRef.current = false;
    let _currentRoom: Room | null = null;

    async function setup() {
      try {
        const joinedRoom = await connectToRoom(roomName, playerName);
        if (cancelledRef.current) {
          joinedRoom.leave();
          return;
        }

        _currentRoom = joinedRoom;
        setRoom(joinedRoom);
        setConnected(true);
        setServerState(joinedRoom.state);

        joinedRoom.onStateChange((state) => {
          setServerState({ ...state });
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
         * Clock synchronization logic.
         * Calculates Round Trip Time (RTT) to align client simulation tick with server.
         * The client stays ahead of the server to ensure inputs arrive before their tick.
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

        joinedRoom.onMessage("world_delta", (data: { tick: number, delta: string }) => {
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
                const deltaPacket = BinaryCompression.unpack<any>(data);
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
            timestamp: Date.now(),
            lastAckedVersion: lastAckedVersionRef.current
        });

        joinedRoom.onLeave((_code) => {
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
      disconnect();
      setConnected(false);
      setRoom(null);
    };
  }, [roomName, playerName, active]);

  const sendInput = useCallback((input: Record<string, boolean>) => {
    if (!room || !connected) return null;

    // Periodically sync tick and ack version
    if (localTickRef.current % 60 === 0) {
        room.send("sync_tick", {
            timestamp: Date.now(),
            lastAckedVersion: lastAckedVersionRef.current
        });
    }

    localTickRef.current++;
    const actions: string[] = [];
    if (input.thrust) actions.push("thrust");
    if (input.rotateLeft) actions.push("rotateLeft");
    if (input.rotateRight) actions.push("rotateRight");
    if (input.shoot) actions.push("shoot");
    if (input.hyperspace) actions.push("hyperspace");

    const frame: InputFrame = {
        tick: localTickRef.current,
        timestamp: Date.now(),
        actions,
        axes: {
            thrust: input.thrust ? 1 : 0,
            rotate_left: input.rotateLeft ? 1 : 0,
            rotate_right: input.rotateRight ? 1 : 0,
            rotate_x: input.rotateLeft ? -1 : (input.rotateRight ? 1 : 0)
        }
    };

    room.send("input", frame);

    // Store in local buffer for reconciliation later
    inputBufferRef.current.push(frame);
    if (inputBufferRef.current.length > 120) {
        inputBufferRef.current.shift();
    }
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

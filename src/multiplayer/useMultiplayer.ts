import { useEffect, useState, useRef, useCallback } from "react";
import { connectToRoom, disconnect } from "./ColyseusClient";
import { Room } from "@colyseus/sdk";
import { InputFrame } from "./NetTypes";

export function useMultiplayer(roomName: string, playerName: string, active: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverState, setServerState] = useState<any>(null);
  const cancelledRef = useRef(false);

  const localTickRef = useRef(0);
  const serverTickRef = useRef(0);
  const lastProcessedTickRef = useRef(0);
  const inputBufferRef = useRef<InputFrame[]>([]);

  useEffect(() => {
    if (!active || !playerName) return;

    cancelledRef.current = false;

    async function setup() {
      try {
        const joinedRoom = await connectToRoom(roomName, playerName);
        if (cancelledRef.current) {
          joinedRoom.leave();
          return;
        }

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

        joinedRoom.onMessage("sync_tick", (data: { serverTick: number, timestamp: number }) => {
            const now = Date.now();
            const rtt = now - data.timestamp;
            // Approximate local tick to be ahead of server by half RTT + buffer
            localTickRef.current = data.serverTick + Math.ceil((rtt / 2) / 16.66) + 2;
            console.log(`Synced tick: server=${data.serverTick}, local=${localTickRef.current}, rtt=${rtt}`);
        });

        joinedRoom.send("sync_tick");

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

  const sendInput = useCallback((input: any) => {
    if (!room || !connected) return null;

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

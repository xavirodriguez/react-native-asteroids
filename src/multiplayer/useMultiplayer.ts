import { useEffect, useState, useRef } from "react";
import { connectToRoom, disconnect } from "./ColyseusClient";
import { Room } from "@colyseus/sdk";

export function useMultiplayer(roomName: string, playerName: string, active: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverState, setServerState] = useState<any>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!active || !playerName) return;

    cancelledRef.current = false;
    let currentRoom: Room | null = null;

    async function setup() {
      try {
        const joinedRoom = await connectToRoom(roomName, playerName);
        if (cancelledRef.current) {
          joinedRoom.leave();
          return;
        }

        currentRoom = joinedRoom;
        setRoom(joinedRoom);
        setConnected(true);
        setServerState(joinedRoom.state);

        joinedRoom.onStateChange((state) => {
          setServerState({ ...state });
        });

        joinedRoom.onLeave((code) => {
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

  return { room, connected, serverState };
}

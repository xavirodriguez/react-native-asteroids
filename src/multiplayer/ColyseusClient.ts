/**
 * Network transport layer using Colyseus.
 *
 * This module manages the connection lifecycle, room joins, and message dispatching
 * to the authoritative game server.
 *
 * @packageDocumentation
 */

import { Client, Room } from "@colyseus/sdk";

const COLYSEUS_ENDPOINT =
  process.env.EXPO_PUBLIC_COLYSEUS_URL ?? "ws://127.0.0.1:2567";

let client: Client | null = null;
let room: Room | null = null;

/**
 * Lazily initializes and returns the singleton Colyseus client.
 */
export function getColyseusClient() {
  if (!client) {
    client = new Client(COLYSEUS_ENDPOINT);
  }
  return client;
}

/**
 * Attempts to connect to a specific game room.
 * @param roomName - The logic identifier of the room (e.g., 'asteroids').
 * @param playerName - The display name for the local player.
 */
export async function connectToRoom(roomName: string, playerName: string) {
  const client = getColyseusClient();
  room = await client.joinOrCreate(roomName, { name: playerName });
  return room;
}

/**
 * Sends a network message to the active room.
 */
export function sendInput(type: string, input: unknown) {
  room?.send(type, input);
}

/**
 * Returns the currently active Colyseus room, if any.
 */
export function getRoom() { return room; }

/**
 * Leaves the current room and optionally resets the client singleton.
 */
export function disconnect(options?: { resetClient?: boolean }) {
    room?.leave();
    room = null;
    if (options?.resetClient) {
        client = null;
    }
}

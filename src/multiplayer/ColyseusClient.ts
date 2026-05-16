/**
 * Network transport layer using Colyseus.
 */

import { Client, Room } from "@colyseus/sdk";

const COLYSEUS_ENDPOINT =
  process.env.EXPO_PUBLIC_COLYSEUS_URL ?? "ws://127.0.0.1:2567";

/**
 * Encapsulates a Colyseus connection to avoid global module state.
 *
 * API status: Public
 */
export class ColyseusConnection {
  private client: Client;
  private room: Room | null = null;

  constructor(endpoint: string = COLYSEUS_ENDPOINT) {
    this.client = new Client(endpoint);
  }

  /**
   * Attempts to connect to a specific game room.
   */
  public async connect(roomName: string, options: Record<string, unknown> = {}) {
    this.room = await this.client.joinOrCreate(roomName, options);
    return this.room;
  }

  /**
   * Sends a network message to the active room.
   */
  public send(type: string, payload: unknown) {
    this.room?.send(type, payload);
  }

  /**
   * Returns the currently active Colyseus room, if any.
   */
  public getRoom() {
    return this.room;
  }

  /**
   * Leaves the current room.
   */
  public disconnect() {
    this.room?.leave();
    this.room = null;
  }
}

// LEGACY COMPATIBILITY (Deprecated)
let defaultConnection: ColyseusConnection | null = null;

function getDefaultConnection() {
  if (!defaultConnection) defaultConnection = new ColyseusConnection();
  return defaultConnection;
}

/** @deprecated Use ColyseusConnection class */
export function getColyseusClient() {
  return new Client(COLYSEUS_ENDPOINT);
}

/** @deprecated Use ColyseusConnection class */
export async function connectToRoom(roomName: string, playerName: string) {
  return getDefaultConnection().connect(roomName, { name: playerName });
}

/** @deprecated Use ColyseusConnection class */
export function sendInput(type: string, input: unknown) {
  getDefaultConnection().send(type, input);
}

/** @deprecated Use ColyseusConnection class */
export function getRoom() {
  return getDefaultConnection().getRoom();
}

/** @deprecated Use ColyseusConnection class */
export function disconnect(options?: { resetClient?: boolean }) {
  getDefaultConnection().disconnect();
  if (options?.resetClient) defaultConnection = null;
}

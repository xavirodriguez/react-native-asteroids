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

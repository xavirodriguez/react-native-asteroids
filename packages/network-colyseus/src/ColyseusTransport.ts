import { NetworkTransport } from "@tiny-aster/core";
import { Client, Room } from "@colyseus/sdk";

/**
 * Network transport implementation using Colyseus.
 *
 * @remarks
 * Provides a bridge between the game engine and Colyseus server.
 * Note that real-time synchronization and determinism depend on the
 * server-side room implementation and network conditions.
 */
export class ColyseusTransport implements NetworkTransport {
  private client: Client;
  private room: Room | null = null;

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  async connect(roomName: string, options: any = {}): Promise<void> {
    this.room = await this.client.joinOrCreate(roomName, options);
  }

  disconnect(): void {
    this.room?.leave();
    this.room = null;
  }

  send(type: string, message: any): void {
    this.room?.send(type, message);
  }

  onMessage(type: string, callback: (message: any) => void): void {
    this.room?.onMessage(type, callback);
  }

  getSessionId(): string | undefined {
    return this.room?.sessionId;
  }
}

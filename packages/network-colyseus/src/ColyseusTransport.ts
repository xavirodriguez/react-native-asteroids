import { NetworkTransport } from "@tiny-aster/core";
import { Client, Room } from "@colyseus/sdk";

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

  onMessage(type: string, callback: (message: any) => void): () => void {
    return this.room?.onMessage(type, callback) ?? (() => {});
  }

  getSessionId(): string | undefined {
    return this.room?.sessionId;
  }
}

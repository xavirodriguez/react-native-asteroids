import { NetworkTransport } from "@tiny-aster/core";
import { Client, Room } from "@colyseus/sdk";

/**
 * Network transport implementation using Colyseus.
 */
export class ColyseusTransport implements NetworkTransport {
  private client: Client | null = null;
  private room: Room | null = null;
  private messageHandlers = new Map<string, Set<(message: unknown) => void>>();

  /**
   * Establishes a connection to a remote server.
   * @param url - The server URL.
   * @param roomName - Optional room name (defaults to "game").
   * @param options - Optional connection options.
   */
  public async connect(url: string, roomName: string = "game", options: Record<string, unknown> = {}): Promise<void> {
    this.client = new Client(url);
    this.room = await this.client.joinOrCreate(roomName, options);

    this.room.onMessage("*", (type, message) => {
      const typeStr = typeof type === "string" ? type : String(type);
      const handlers = this.messageHandlers.get(typeStr);
      if (handlers) {
        handlers.forEach((handler) => handler(message));
      }
    });
  }

  public send(type: string, message: unknown): void {
    if (this.room) {
      this.room.send(type, message);
    }
  }

  public onMessage(type: string, handler: (message: unknown) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  public disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.messageHandlers.clear();
  }

  public getRoom(): Room | null {
    return this.room;
  }
}

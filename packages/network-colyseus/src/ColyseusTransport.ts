import { NetworkTransport } from "@tiny-aster/core";
import { Client, Room } from "@colyseus/sdk";

/**
 * Network transport implementation using Colyseus.
 */
export class ColyseusTransport implements NetworkTransport {
  private client: Client | null = null;
  private room: Room | null = null;
  private messageHandlers = new Map<string, Set<(message: any) => void>>();

  /**
   * @param roomName - Default room name to join or create.
   * @param options - Connection options for Colyseus.
   */
  constructor(
    private readonly roomName: string = "game",
    private readonly options: Record<string, any> = {}
  ) {}

  /**
   * Establishes a connection to a remote server.
   * @param url - The server URL.
   * @remarks
   * Room name can be encapsulated in the constructor or potentially parsed from the URL.
   */
  public async connect(url: string): Promise<void> {
    this.client = new Client(url);

    // Simple parsing logic: if the URL has a path, use it as the room name
    let targetRoom = this.roomName;
    try {
      const urlObj = new URL(url);
      const pathRoom = urlObj.pathname.split("/").filter(Boolean).pop();
      if (pathRoom) {
        targetRoom = pathRoom;
      }
    } catch {
      // If URL parsing fails, stick to the constructor-provided roomName
    }

    this.room = await this.client.joinOrCreate(targetRoom, this.options);

    // Register a catch-all handler to dispatch to our internal handlers
    this.room.onMessage("*", (type, message) => {
      const typeStr = typeof type === "string" ? type : String(type);
      const handlers = this.messageHandlers.get(typeStr);
      if (handlers) {
        handlers.forEach((handler) => handler(message));
      }
    });
  }

  /**
   * Sends a message to the server.
   */
  public send(type: string, message: any): void {
    if (this.room) {
      this.room.send(type, message);
    }
  }

  /**
   * Registers a message handler.
   * @remarks
   * Implementation discards the Colyseus unsubscriber to match void return signature.
   */
  public onMessage(type: string, handler: (message: any) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
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

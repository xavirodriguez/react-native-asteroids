import { NetworkTransport } from "@tiny-aster/core";
import { Client, Room } from "@colyseus/sdk";

/**
 * Network transport implementation using Colyseus.
 */
export class ColyseusTransport implements NetworkTransport {
  public readonly isOffline = false;
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
   */
  public async connect(url: string): Promise<void> {
    let connectionUrl = url;
    let targetRoom = this.roomName;

    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);

      if (pathSegments.length > 0) {
        // Use the last segment as room name if present
        targetRoom = pathSegments[pathSegments.length - 1];

        // Strip the room name from the URL to get the base Colyseus server URL
        urlObj.pathname = pathSegments.slice(0, -1).join("/");
        connectionUrl = urlObj.toString().replace(/\/$/, "");
      }
    } catch {
      // Fallback to defaults if URL parsing fails
    }

    this.client = new Client(connectionUrl);
    this.room = await this.client.joinOrCreate(targetRoom, this.options);

    // Register a wildcard listener to dispatch messages to local handlers
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
   * Discards Colyseus' unsubscribe return to match NetworkTransport signature.
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

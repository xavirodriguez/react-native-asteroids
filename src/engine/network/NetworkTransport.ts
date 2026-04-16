/**
 * Generic interface for network communication.
 * Allows decoupling the engine from specific transport implementations (WebSockets, WebRTC, etc.).
 */
export interface NetworkTransport {
  /**
   * Sends data to the server or other peers.
   */
  send(data: unknown): void;

  /**
   * Registers a callback for receiving messages.
   */
  onMessage(callback: (data: unknown) => void): void;

  /**
   * Connects to the network.
   */
  connect(url: string, options?: Record<string, unknown>): Promise<void>;

  /**
   * Disconnects from the network.
   */
  disconnect(): void;

  /**
   * Gets the unique session ID for the local player.
   */
  getSessionId(): string | undefined;
}

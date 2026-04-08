/**
 * Generic interface for network communication.
 * Allows decoupling the engine from specific transport implementations (WebSockets, WebRTC, etc.).
 */
export interface NetworkTransport {
  /**
   * Sends data to the server or other peers.
   */
  send(data: any): void;

  /**
   * Registers a callback for receiving messages.
   */
  onMessage(callback: (data: any) => void): void;

  /**
   * Connects to the network.
   */
  connect(url: string, options?: any): Promise<void>;

  /**
   * Disconnects from the network.
   */
  disconnect(): void;

  /**
   * Gets the unique session ID for the local player.
   */
  getSessionId(): string | undefined;
}

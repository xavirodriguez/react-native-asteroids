/**
 * Interface for network communication abstractions.
 *
 * @public
 *
 * @remarks
 * Designed to help decouple the engine from specific transport implementations
 * (WebSockets, WebRTC, etc.). Synchronization behavior is typically influenced
 * by the underlying protocol and implementation rather than this interface.
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
   * Attempts to connect to the network.
   */
  connect(url: string, options?: Record<string, unknown>): Promise<void>;

  /**
   * Requests a disconnection from the network.
   */
  disconnect(): void;

  /**
   * Gets the unique session ID for the local player.
   */
  getSessionId(): string | undefined;
}

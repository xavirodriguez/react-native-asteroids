/**
 * Interface for network communication abstractions.
 *
 * @remarks
 * Implementations are designed to handle message delivery across the network.
 * Note that delivery guarantees (reliability, ordering, latency) depend on
 * the underlying implementation and protocol (e.g., WebSocket vs WebRTC).
 */
export interface NetworkTransport {
  /**
   * Sends data to the server or other peers.
   */
  send(type: string, message: any): void;

  /**
   * Registers a callback for receiving messages.
   */
  onMessage(type: string, callback: (message: any) => void): void;

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

/**
 * Interface for network communication abstractions.
 *
 * @remarks
 * Implementations are intended to handle message delivery across the network.
 * Note that specific delivery guarantees (such as reliability, ordering, or latency)
 * are generally dependent on the underlying transport implementation and protocol
 * (e.g., WebSocket, WebRTC, or UDP-based solutions).
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

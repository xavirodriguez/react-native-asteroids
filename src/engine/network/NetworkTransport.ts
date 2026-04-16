/**
 * @packageDocumentation
 * Abstract Network Transport layer.
 * Decouples the game engine from specific communication protocols (WebSockets, WebRTC, etc.).
 */

/**
 * Generic interface for network communication.
 * Allows decoupling the engine from specific transport implementations.
 *
 * @remarks
 * Implementations of this interface (e.g., `ColyseusTransport`, `SocketIOTransport`)
 * handle the low-level details of connection management, serialization, and packet delivery.
 *
 * @responsibility Provide a uniform API for sending and receiving raw data.
 * @responsibility Abstract connection lifecycle (connect, disconnect).
 * @responsibility Identify the local session uniquely.
 */
export interface NetworkTransport {
  /**
   * Sends data to the server or other connected peers.
   *
   * @param data - The payload to send. Implementation handles serialization.
   * @sideEffect Initiates network IO.
   */
  send(data: unknown): void;

  /**
   * Registers a callback for receiving messages from the network.
   *
   * @param callback - Function invoked when new data arrives.
   * @remarks
   * Only one callback is typically supported by this abstraction.
   */
  onMessage(callback: (data: unknown) => void): void;

  /**
   * Connects to the network service.
   *
   * @param url - The endpoint URL to connect to.
   * @param options - Implementation-specific connection parameters (e.g., tokens, room IDs).
   * @returns A promise that resolves when the connection is established.
   * @throws Error if the connection fails or timeouts.
   */
  connect(url: string, options?: Record<string, unknown>): Promise<void>;

  /**
   * Disconnects from the network and cleans up resources.
   * @sideEffect Closes active sockets/connections.
   */
  disconnect(): void;

  /**
   * Gets the unique session ID assigned to the local player by the network service.
   *
   * @returns The session ID string, or `undefined` if not connected.
   * @queries Connection state.
   */
  getSessionId(): string | undefined;
}

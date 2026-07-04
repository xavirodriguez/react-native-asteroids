import { NetworkTransport } from "./NetworkTransport";

/**
 * A no-op implementation of NetworkTransport for offline mode.
 *
 * @remarks
 * This implementation allows the game to function in a disconnected state
 * without requiring a real network connection or throwing errors.
 */
export class NullTransport implements NetworkTransport {
  /**
   * Immediately resolves without establishing a connection.
   */
  public async connect(_url: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * No-op: messages are not sent.
   */
  public send(_type: string, _message: any): void {
    // No-op
  }

  /**
   * No-op: no messages will ever be received.
   */
  public onMessage(_type: string, _handler: (message: any) => void): void {
    // No-op
  }

  /**
   * No-op: nothing to disconnect.
   */
  public disconnect(): void {
    // No-op
  }
}

/**
 * Interface for network transport implementations.
 *
 * @remarks
 * Defines the contract for sending and receiving messages over the network.
 * Implementations are expected to handle platform-specific socket logic.
 */
export interface NetworkTransport {
    /**
     * Establishes a connection to a remote server.
     */
    connect(url: string): Promise<void>;
    send(type: string, message: any): void;
    onMessage(type: string, handler: (message: any) => void): void;
    disconnect(): void;
}

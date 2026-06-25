/**
 * Interface for network transport implementations.
 *
 * @remarks
 * Defines the contract for sending and receiving messages over the network.
 * Implementations are responsible for platform-specific socket logic,
 * connection management, and message serialization.
 */
export interface NetworkTransport {
    /**
     * Establishes a connection to a remote server.
     */
    connect(url: string): Promise<void>;
    send(type: string, message: any): void;
    onMessage(type: string, handler: (message: any) => void): () => void;
    disconnect(): void;
}

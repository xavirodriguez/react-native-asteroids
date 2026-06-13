export interface NetworkTransport {
    connect(url: string): Promise<void>;
    send(type: string, message: any): void;
    onMessage(type: string, handler: (message: any) => void): void;
    disconnect(): void;
}

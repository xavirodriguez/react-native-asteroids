export interface NetworkTransport {
  connect(url: string, options?: any): Promise<void>;
  disconnect(): void;
  send(type: string, message: any): void;
  onMessage(type: string, callback: (message: any) => void): () => void;
  getSessionId(): string | undefined;
}

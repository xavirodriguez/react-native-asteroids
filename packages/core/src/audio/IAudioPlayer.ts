export interface IAudioPlayer {
  loadSFX(id: string, options: any): Promise<void>;
  playSFX(id: string, options?: any): void;
}

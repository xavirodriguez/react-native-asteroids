/** @public */
export interface IAudioPlayer {
  loadSFX(id: string, options: any): Promise<void>;
  playSFX(id: string, options?: any): void;
}

/**
 * A fallback implementation of IAudioPlayer that performs no operations.
 * Suitable for headless environments, server execution, or testing.
 * @public
 */
export class NullAudioPlayer implements IAudioPlayer {
  public async loadSFX(id: string, options: any): Promise<void> {}
  public playSFX(id: string, options?: any): void {}
}

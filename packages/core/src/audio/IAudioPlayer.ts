/** @public */
export interface IAudioPlayer {
  loadSFX(id: string, options: unknown): Promise<void>;
  playSFX(id: string, options?: unknown): void;
}

/**
 * A fallback implementation of IAudioPlayer that performs no operations.
 * Suitable for headless environments, server execution, or testing.
 * @public
 */
export class NullAudioPlayer implements IAudioPlayer {
  public async loadSFX(_id: string, _options: unknown): Promise<void> {}
  public playSFX(_id: string, _options?: unknown): void {}
}

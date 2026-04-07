/**
 * Simple Audio System for web and mobile using the Web Audio API.
 * Supports SFX, Music, volume control, and looping.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private sfxMap = new Map<string, AudioBuffer>();
  private musicMap = new Map<string, AudioBuffer>();
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;

  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 1.0;

  constructor() {
    if (typeof window !== "undefined") {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Resumes the audio context (required by browsers after user interaction).
   */
  public resume(): void {
    this.ctx?.resume();
  }

  /**
   * Preloads an SFX file.
   */
  public async loadSFX(name: string, url: string): Promise<void> {
    const buffer = await this.loadBuffer(url);
    if (buffer) this.sfxMap.set(name, buffer);
  }

  /**
   * Preloads a Music file.
   */
  public async loadMusic(name: string, url: string): Promise<void> {
    const buffer = await this.loadBuffer(url);
    if (buffer) this.musicMap.set(name, buffer);
  }

  /**
   * Plays a preloaded SFX.
   */
  public playSFX(name: string): void {
    const buffer = this.sfxMap.get(name);
    if (buffer && this.ctx) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();

      source.buffer = buffer;
      gain.gain.value = this.masterVolume * this.sfxVolume;

      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } else {
      // Fallback to HTML Audio if Web Audio buffer not loaded
      const audio = new Audio(`/assets/audio/${name}.wav`);
      audio.volume = this.masterVolume * this.sfxVolume;
      audio.play().catch(() => {});
    }
  }

  /**
   * Plays a preloaded Music file.
   */
  public playMusic(name: string, options: { loop?: boolean; volume?: number } = {}): void {
    const buffer = this.musicMap.get(name);
    if (buffer && this.ctx) {
      this.stopMusic();

      this.currentMusicSource = this.ctx.createBufferSource();
      this.currentMusicGain = this.ctx.createGain();

      this.currentMusicSource.buffer = buffer;
      this.currentMusicSource.loop = options.loop || false;
      this.currentMusicGain.gain.value = this.masterVolume * this.musicVolume * (options.volume || 1.0);

      this.currentMusicSource.connect(this.currentMusicGain);
      this.currentMusicGain.connect(this.ctx.destination);
      this.currentMusicSource.start();
    }
  }

  /**
   * Stops the current music playback.
   */
  public stopMusic(): void {
    if (this.currentMusicSource) {
      this.currentMusicSource.stop();
      this.currentMusicSource = null;
      this.currentMusicGain = null;
    }
  }

  /**
   * Sets the master volume level (0.0 to 1.0).
   */
  public setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.currentMusicGain) {
      this.currentMusicGain.gain.value = this.masterVolume * this.musicVolume;
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.ctx.decodeAudioBuffer(arrayBuffer);
    } catch (e) {
      console.error(`Failed to load audio buffer: ${url}`, e);
      return null;
    }
  }
}

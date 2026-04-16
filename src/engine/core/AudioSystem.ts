/**
 * @packageDocumentation
 * High-level Audio Management.
 * Provides a unified API for music and SFX playback using the Web Audio API.
 */

/**
 * Simple Audio System for web and mobile using the Web Audio API.
 *
 * @remarks
 * This system manages the lifecycle of audio buffers and playback sources.
 * It supports global volume control, category-based volumes (SFX vs Music),
 * and fallback to standard HTML5 Audio for basic sound effects.
 *
 * @responsibility High-level management of SFX and Music playback, volume control, and preloading.
 *
 * @conceptualRisk [AUTOPLAY] Browser policies typically suspend the `AudioContext` until a user interaction occurs.
 * @conceptualRisk [LATENCY_MISMATCH] Fallback to HTML Audio for SFX may exhibit significantly higher latency than Web Audio.
 *
 * @sideEffect Modifies global browser audio state via `AudioContext`.
 * @sideEffect Creates and manages DOM `Audio` elements when fallbacks are triggered.
 *
 * @example
 * ```ts
 * const audio = new AudioSystem();
 * await audio.loadSFX("jump", "/sounds/jump.wav");
 * // In response to user click:
 * audio.resume();
 * audio.playSFX("jump");
 * ```
 */
export class AudioSystem {
  /** The underlying Web Audio API context. */
  private ctx: AudioContext | null = null;
  /** Cache for preloaded Sound Effect buffers. */
  private sfxMap = new Map<string, AudioBuffer>();
  /** Cache for preloaded Music buffers. */
  private musicMap = new Map<string, AudioBuffer>();
  /** Handle to the currently playing music source. */
  private currentMusicSource: AudioBufferSourceNode | null = null;
  /** Gain node for controlling the volume of the current music track. */
  private currentMusicGain: GainNode | null = null;

  /** Master volume multiplier (0.0 to 1.0). */
  private masterVolume: number = 1.0;
  /** SFX-specific volume multiplier. */
  private sfxVolume: number = 1.0;
  /** Music-specific volume multiplier. */
  private musicVolume: number = 1.0;

  /**
   * Creates a new AudioSystem and initializes the AudioContext.
   */
  constructor() {
    if (typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
  }

  /**
   * Resumes the audio context (required by browsers after user interaction).
   *
   * @remarks
   * Most modern browsers will not play audio until the `AudioContext` is explicitly
   * resumed within a user gesture handler (e.g., `onClick`).
   *
   * @precondition Must be called as a direct result of a user gesture (e.g., click, touch) to comply with browser policies.
   */
  public resume(): void {
    this.ctx?.resume();
  }

  /**
   * Preloads an SFX file into a Web Audio buffer.
   *
   * @param name - Unique identifier for the sound.
   * @param url - Path to the audio file.
   */
  public async loadSFX(name: string, url: string): Promise<void> {
    const buffer = await this.loadBuffer(url);
    if (buffer) this.sfxMap.set(name, buffer);
  }

  /**
   * Preloads a Music file into a Web Audio buffer.
   *
   * @param name - Unique identifier for the track.
   * @param url - Path to the audio file.
   */
  public async loadMusic(name: string, url: string): Promise<void> {
    const buffer = await this.loadBuffer(url);
    if (buffer) this.musicMap.set(name, buffer);
  }

  /**
   * Plays a preloaded SFX.
   *
   * @param name - The identifier of the SFX.
   *
   * @remarks
   * If the Web Audio buffer is not available, it attempts a fallback to a
   * dynamic HTML `<audio>` element.
   * Note: Fallback assumes a specific directory structure (`/assets/audio/`).
   *
   * @sideEffect Creates short-lived `AudioBufferSourceNode` objects.
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
      if (typeof Audio !== "undefined") {
        const audio = new Audio(`/assets/audio/${name}.wav`);
        audio.volume = this.masterVolume * this.sfxVolume;
        audio.play().catch(() => {});
      }
    }
  }

  /**
   * Plays a preloaded Music file.
   *
   * @param name - The identifier of the track.
   * @param options - Configuration for looping and track-specific volume.
   *
   * @remarks
   * Automatically stops any currently playing music before starting the new track.
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
   * Stops the current music playback and cleans up the source node.
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
   *
   * @param value - New volume multiplier.
   * @remarks
   * Immediately updates the gain of the currently playing music track.
   */
  public setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.currentMusicGain) {
      this.currentMusicGain.gain.value = this.masterVolume * this.musicVolume;
    }
  }

  /**
   * Internal helper to fetch and decode audio files.
   */
  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      // decodeAudioData is the standard method for Web Audio
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error(`Failed to load audio buffer: ${url}`, e);
      return null;
    }
  }
}

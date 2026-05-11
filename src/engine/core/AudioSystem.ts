import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SoundId =
  | 'shoot'
  | 'explosion'
  | 'hit'
  | 'powerup'
  | 'game_over'
  | 'menu_select'
  | 'level_up';

const MUTE_KEY = "settings:audio_muted";
const VOLUME_KEY = "settings:audio_volume";

// Conditionally import expo-av for native
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AudioNative: any = null;
if (Platform.OS !== "web") {
    try {
        AudioNative = require("expo-av").Audio;
    } catch {
        console.warn("[AudioSystem] expo-av not found in this environment.");
    }
}

/**
 * Multi-platform Audio System.
 *
 * @responsibility High-level management of SFX and Music playback.
 * @responsibility Handle platform-specific audio drivers (Web Audio vs Native).
 * @responsibility Persist user preferences (mute, volume).
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private sfxMap = new Map<string, AudioBuffer | string | number>();
  private musicMap = new Map<string, AudioBuffer | string | number>();
  private currentMusicSource: AudioBufferSourceNode | unknown = null;
  private currentMusicGain: GainNode | null = null;
  private nativeSounds = new Map<string, unknown>();

  private masterVolume: number = 1.0;
  private muted: boolean = false;

  constructor() {
    if (Platform.OS === "web") {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    this.loadPreferences();
  }

  private async loadPreferences() {
    try {
      const m = await AsyncStorage.getItem(MUTE_KEY);
      const v = await AsyncStorage.getItem(VOLUME_KEY);
      if (m !== null) this.muted = m === "true";
      if (v !== null) this.masterVolume = parseFloat(v);
    } catch (e) {
      console.warn("[AudioSystem] Failed to load preferences", e);
    }
  }

  public async setMuted(muted: boolean) {
    this.muted = muted;
    await AsyncStorage.setItem(MUTE_KEY, String(muted));
    if (this.currentMusicGain && Platform.OS === "web") {
        this.currentMusicGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  public async setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    await AsyncStorage.setItem(VOLUME_KEY, String(this.masterVolume));
    if (this.currentMusicGain && Platform.OS === "web") {
        this.currentMusicGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  public isMuted() { return this.muted; }
  public getVolume() { return this.masterVolume; }

  public resume(): void {
    if (Platform.OS === "web") {
        this.ctx?.resume();
    }
  }

  public async loadSFX(name: string, url: string): Promise<void> {
    if (Platform.OS === "web") {
        const buffer = await this.loadBuffer(url);
        if (buffer) this.sfxMap.set(name, buffer);
    } else if (AudioNative) {
        try {
            // Pre-load logic for expo-av would go here if needed
            this.sfxMap.set(name, url);
        } catch (e) {
            console.warn(`[AudioSystem] Failed to load native SFX: ${name}`, e);
        }
    }
  }

  public async loadMusic(name: string, url: string): Promise<void> {
    if (Platform.OS === "web") {
        const buffer = await this.loadBuffer(url);
        if (buffer) this.musicMap.set(name, buffer);
    } else {
        this.musicMap.set(name, url);
    }
  }

  public async playSFX(name: string): Promise<void> {
    if (this.muted) return;

    if (Platform.OS === "web") {
        const buffer = this.sfxMap.get(name);
        if (buffer && this.ctx && buffer instanceof AudioBuffer) {
            const source = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            source.buffer = buffer;
            gain.gain.value = this.masterVolume;
            source.connect(gain);
            gain.connect(this.ctx.destination);
            source.start();
        }
    } else if (AudioNative) {
        const source = this.sfxMap.get(name);
        if (!source) return;

        try {
            const { sound } = await AudioNative.Sound.createAsync(
                typeof source === "string" ? { uri: source } : source,
                { volume: this.masterVolume }
            );
            await sound.playAsync();
            // Automatically unload after playing to prevent leaks
            sound.setOnPlaybackStatusUpdate((status: { didJustFinish: boolean }) => {
                if (status.didJustFinish) sound.unloadAsync();
            });
        } catch (e) {
            console.warn(`[AudioSystem] Native SFX Play error: ${name}`, e);
        }
    }
  }

  public async playMusic(name: string, options: { loop?: boolean; volume?: number } = {}): Promise<void> {
    if (this.muted) return;

    if (Platform.OS === "web") {
        const buffer = this.musicMap.get(name);
        if (buffer && this.ctx && buffer instanceof AudioBuffer) {
            this.stopMusic();
            const source = this.ctx.createBufferSource();
            this.currentMusicSource = source;
            this.currentMusicGain = this.ctx.createGain();
            source.buffer = buffer;
            source.loop = options.loop || false;
            this.currentMusicGain.gain.value = this.masterVolume * (options.volume || 1.0);
            source.connect(this.currentMusicGain);
            this.currentMusicGain.connect(this.ctx.destination);
            source.start();
        }
    } else if (AudioNative) {
        const source = this.musicMap.get(name);
        if (!source) return;

        this.stopMusic();
        try {
            const { sound } = await AudioNative.Sound.createAsync(
                typeof source === "string" ? { uri: source } : source,
                {
                    shouldPlay: true,
                    isLooping: options.loop,
                    volume: this.masterVolume * (options.volume || 1.0)
                }
            );
            this.currentMusicSource = sound;
        } catch (e) {
            console.warn(`[AudioSystem] Native Music Play error: ${name}`, e);
        }
    }
  }

  public async stopMusic(): Promise<void> {
    if (Platform.OS === "web" && this.currentMusicSource && this.currentMusicSource instanceof AudioBufferSourceNode) {
      this.currentMusicSource.stop();
      this.currentMusicSource = null;
      this.currentMusicGain = null;
    } else if (AudioNative && this.currentMusicSource) {
        const sound = this.currentMusicSource as { stopAsync: () => Promise<void>, unloadAsync: () => Promise<void> };
        await sound.stopAsync();
        await sound.unloadAsync();
        this.currentMusicSource = null;
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch (_e) {
      console.warn(`[AudioSystem] Failed to load buffer: ${url}`);
      return null;
    }
  }
}

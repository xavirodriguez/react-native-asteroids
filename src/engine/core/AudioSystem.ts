import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AudioSettingsService } from "../../services/AudioSettingsService";

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

// Conditionally import expo-audio for native
let createAudioPlayer:
  | ((source: import("expo-audio").AudioSource) => import("expo-audio").AudioPlayer)
  | null = null;

if (Platform.OS !== "web") {
  try {
    createAudioPlayer = require("expo-audio").createAudioPlayer;
  } catch {
    console.warn("[AudioSystem] expo-audio not found in this environment.");
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
  private currentMusicVolume: number = 1.0;

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

    if (this.currentMusicSource && Platform.OS !== "web") {
      const player = this.currentMusicSource as import("expo-audio").AudioPlayer;
      player.volume = this.muted ? 0 : this.masterVolume * this.currentMusicVolume;
    }
  }

  public async setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    await AsyncStorage.setItem(VOLUME_KEY, String(this.masterVolume));
    if (this.currentMusicGain && Platform.OS === "web") {
        this.currentMusicGain.gain.value = this.muted ? 0 : this.masterVolume;
    }

    if (this.currentMusicSource && Platform.OS !== "web") {
      const player = this.currentMusicSource as import("expo-audio").AudioPlayer;
      player.volume = this.muted ? 0 : this.masterVolume * this.currentMusicVolume;
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
    } else {
      // In expo-audio we just store the source for now
      this.sfxMap.set(name, url);
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
    if (this.muted || AudioSettingsService.isMuted()) return;

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
    } else if (createAudioPlayer) {
      const source = this.sfxMap.get(name);
      if (!source) return;

      try {
        const player = createAudioPlayer(
          typeof source === "string" ? { uri: source } : (source as import("expo-audio").AudioSource)
        );

        player.volume = this.masterVolume;
        player.play();

        const sub = player.addListener("playbackStatusUpdate", (status) => {
          if (status.didJustFinish) {
            sub.remove();
            player.remove();
          }
        });
      } catch (e) {
        console.warn(`[AudioSystem] Native SFX Play error: ${name}`, e);
      }
    }
  }

  public async playMusic(name: string, options: { loop?: boolean; volume?: number } = {}): Promise<void> {
    if (this.muted || AudioSettingsService.isMuted()) return;

    if (Platform.OS === "web") {
      const buffer = this.musicMap.get(name);
      if (buffer && this.ctx && buffer instanceof AudioBuffer) {
        await this.stopMusic();
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
    } else if (createAudioPlayer) {
      const source = this.musicMap.get(name);
      if (!source) return;

      await this.stopMusic();
      try {
        const player = createAudioPlayer(
          typeof source === "string" ? { uri: source } : (source as import("expo-audio").AudioSource)
        );

        this.currentMusicVolume = options.volume ?? 1.0;
        player.loop = options.loop ?? false;
        player.volume = this.muted
          ? 0
          : this.masterVolume * this.currentMusicVolume;

        player.play();
        this.currentMusicSource = player;
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
    } else if (createAudioPlayer && this.currentMusicSource) {
      try {
        const player = this.currentMusicSource as import("expo-audio").AudioPlayer;
        player.pause();
        player.remove();
      } catch (e) {
        console.warn("[AudioSystem] Error stopping native music", e);
      }
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

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AudioSettingsService } from "../../services/AudioSettingsService";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Asset } from "expo-asset";
import { AssetDescriptor } from "../assets/AssetTypes";

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
  private currentMusicSource: AudioBufferSourceNode | AudioPlayer | null = null;
  private currentMusicGain: GainNode | null = null;
  private currentMusicVolume: number = 1.0;
  private nativeSounds = new Map<string, AudioPlayer>();

  private masterVolume: number = 1.0;
  private muted: boolean = false;

  constructor() {
    if (Platform.OS !== "web") {
      setAudioModeAsync({
        playsInSilentMode: true,
      }).catch(err => console.warn("[AudioSystem] Failed to set audio mode", err));
    }

    if (Platform.OS === "web") {
      // @ts-expect-error - Supporting both standard and legacy webkit AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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

    if (Platform.OS === "web" && this.currentMusicGain) {
      this.currentMusicGain.gain.value = this.muted ? 0 : this.masterVolume;
    } else if (Platform.OS !== "web" && this.currentMusicSource) {
      const player = this.currentMusicSource as AudioPlayer;
      player.volume = this.muted ? 0 : this.masterVolume;
    }
  }

  public async setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    await AsyncStorage.setItem(VOLUME_KEY, String(this.masterVolume));

    if (Platform.OS === "web" && this.currentMusicGain) {
      this.currentMusicGain.gain.value = this.muted ? 0 : this.masterVolume * this.currentMusicVolume;
    } else if (Platform.OS !== "web" && this.currentMusicSource) {
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

  /**
   * Resolves an asset source to a usable URI.
   */
  private async resolveSource(source: string | { uri: string } | { module: number } | AssetDescriptor): Promise<string> {
    if (typeof source === "string") {
      // If it looks like a web path and we are on native, it might be an error or need special handling.
      // However, for backward compatibility, we'll try to resolve it with Asset.fromURI if it's not a full URL.
      if (Platform.OS !== "web" && source.startsWith("/") && !source.startsWith("//")) {
         // This is likely a web-specific relative path that won't work on native.
         // We should ideally use require() for these.
         console.warn(`[AudioSystem] Using web-relative path "${source}" on native. This may fail.`);
      }
      return source;
    }

    if ("module" in source && source.module !== undefined) {
      const asset = Asset.fromModule(source.module);
      await asset.downloadAsync();
      return asset.localUri ?? asset.uri;
    }

    if ("uri" in source && source.uri !== undefined) {
      const asset = Asset.fromURI(source.uri);
      await asset.downloadAsync();
      return asset.localUri ?? asset.uri ?? source.uri;
    }

    throw new Error(`Invalid audio source: ${JSON.stringify(source)}`);
  }

  public async loadSFX(name: string, source: string | { uri: string } | { module: number } | AssetDescriptor): Promise<void> {
    try {
      const resolvedUri = await this.resolveSource(source);

      if (Platform.OS === "web") {
        const buffer = await this.loadBuffer(resolvedUri);
        if (buffer) this.sfxMap.set(name, buffer);
      } else {
        this.sfxMap.set(name, resolvedUri);
        try {
          const player = createAudioPlayer({ uri: resolvedUri });
          this.nativeSounds.set(`sfx:${name}`, player);
        } catch (e) {
          console.warn(`[AudioSystem] Failed to load native SFX: ${name}`, e);
        }
      }
    } catch (e) {
      console.error(`[AudioSystem] Error loading SFX ${name}:`, e);
    }
  }

  public async loadMusic(name: string, source: string | { uri: string } | { module: number } | AssetDescriptor): Promise<void> {
    try {
      const resolvedUri = await this.resolveSource(source);

      if (Platform.OS === "web") {
        const buffer = await this.loadBuffer(resolvedUri);
        if (buffer) this.musicMap.set(name, buffer);
      } else {
        this.musicMap.set(name, resolvedUri);
        try {
          const player = createAudioPlayer({ uri: resolvedUri });
          this.nativeSounds.set(`music:${name}`, player);
        } catch (e) {
          console.warn(`[AudioSystem] Failed to load native music: ${name}`, e);
        }
      }
    } catch (e) {
      console.error(`[AudioSystem] Error loading music ${name}:`, e);
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
    } else {
      let player = this.nativeSounds.get(`sfx:${name}`);

      if (!player) {
        const source = this.sfxMap.get(name);
        if (typeof source === "string") {
          player = createAudioPlayer({ uri: source });
          this.nativeSounds.set(`sfx:${name}`, player);
        }
      }

      if (player) {
        try {
          player.volume = this.masterVolume;
          player.loop = false;
          player.play();
        } catch (e) {
          console.warn(`[AudioSystem] Native SFX Play error: ${name}`, e);
        }
      }
    }
  }

  public async playMusic(name: string, options: { loop?: boolean; volume?: number } = {}): Promise<void> {
    if (this.muted || AudioSettingsService.isMuted()) return;

    if (Platform.OS === "web") {
      const buffer = this.musicMap.get(name);
      if (buffer && this.ctx && buffer instanceof AudioBuffer) {
        this.stopMusic();
        const source = this.ctx.createBufferSource();
        this.currentMusicSource = source;
        this.currentMusicGain = this.ctx.createGain();
        this.currentMusicVolume = options.volume || 1.0;
        source.buffer = buffer;
        source.loop = options.loop || false;
        this.currentMusicGain.gain.value = this.masterVolume * this.currentMusicVolume;
        source.connect(this.currentMusicGain);
        this.currentMusicGain.connect(this.ctx.destination);
        source.start();
      }
    } else {
      await this.stopMusic();
      let player = this.nativeSounds.get(`music:${name}`);

      if (!player) {
        const url = this.musicMap.get(name);
        if (typeof url === "string") {
          player = createAudioPlayer({ uri: url });
          this.nativeSounds.set(`music:${name}`, player);
        }
      }

      if (player) {
        try {
          this.currentMusicVolume = options.volume || 1.0;
          player.loop = options.loop !== undefined ? options.loop : true;
          player.volume = this.muted ? 0 : this.masterVolume * this.currentMusicVolume;
          player.play();
          this.currentMusicSource = player;
        } catch (e) {
          console.warn(`[AudioSystem] Native Music Play error: ${name}`, e);
        }
      }
    }
  }

  public async stopMusic(): Promise<void> {
    if (Platform.OS === "web") {
      if (this.currentMusicSource && (this.currentMusicSource as any).stop) {
        (this.currentMusicSource as AudioBufferSourceNode).stop();
      }
      this.currentMusicSource = null;
      this.currentMusicGain = null;
    } else if (this.currentMusicSource) {
      const player = this.currentMusicSource as AudioPlayer;
      player.pause();
      player.seekTo(0);
      player.remove();

      // Remove from map to allow clean re-creation
      for (const [key, value] of this.nativeSounds.entries()) {
        if (value === player) {
          this.nativeSounds.delete(key);
          break;
        }
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

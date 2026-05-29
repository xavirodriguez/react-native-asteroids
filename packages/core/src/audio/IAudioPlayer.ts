import { AssetDescriptor } from "../assets/AssetProvider";

export interface IAudioPlayer {
  loadSFX(name: string, source: AssetDescriptor | string): Promise<void>;
  loadMusic(name: string, source: AssetDescriptor | string): Promise<void>;
  playSFX(name: string): Promise<void>;
  playMusic(name: string, options?: { loop?: boolean; volume?: number }): Promise<void>;
  stopMusic(): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setVolume(volume: number): Promise<void>;
  isMuted(): boolean;
  getVolume(): number;
}

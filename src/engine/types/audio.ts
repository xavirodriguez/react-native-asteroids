import { AssetDescriptor } from "../assets/AssetTypes";

export type SoundId =
  | 'shoot'
  | 'explosion'
  | 'hit'
  | 'powerup'
  | 'game_over'
  | 'menu_select'
  | 'level_up';

export type AudioSource = string | { uri: string } | { module: number } | AssetDescriptor;

export interface AudioPlayOptions {
  loop?: boolean;
  volume?: number;
}

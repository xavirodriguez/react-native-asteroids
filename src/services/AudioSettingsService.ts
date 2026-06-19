import AsyncStorage from "@react-native-async-storage/async-storage";

const MUTE_KEY = "settings:audio_muted";

/**
 * Service to manage global audio settings and persistence.
 */
export class AudioSettingsService {
  private static muted: boolean = false;
  private static initialized: boolean = false;

  /**
   * Initializes the service by loading the persisted mute state.
   */
  public static async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const value = await AsyncStorage.getItem(MUTE_KEY);
      this.muted = value === "true";
      this.initialized = true;
    } catch (e) {
      console.warn("[AudioSettingsService] Failed to load mute state", e);
    }
  }

  /**
   * Gets the current mute state.
   */
  public static isMuted(): boolean {
    return this.muted;
  }

  /**
   * Sets the mute state and persists it.
   */
  public static async setMuted(muted: boolean): Promise<void> {
    this.muted = muted;
    try {
      await AsyncStorage.setItem(MUTE_KEY, String(muted));
    } catch (e) {
      console.warn("[AudioSettingsService] Failed to save mute state", e);
    }
  }

  /**
   * Toggles the mute state.
   */
  public static async toggleMute(): Promise<boolean> {
    const newState = !this.muted;
    await this.setMuted(newState);
    return newState;
  }
}

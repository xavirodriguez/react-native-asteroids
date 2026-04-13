/**
 * Simple Audio System for web and mobile using the Web Audio API.
 * Supports SFX, Music, volume control, and looping.
 */
export declare class AudioSystem {
    private ctx;
    private sfxMap;
    private musicMap;
    private currentMusicSource;
    private currentMusicGain;
    private masterVolume;
    private sfxVolume;
    private musicVolume;
    constructor();
    /**
     * Resumes the audio context (required by browsers after user interaction).
     */
    resume(): void;
    /**
     * Preloads an SFX file.
     */
    loadSFX(name: string, url: string): Promise<void>;
    /**
     * Preloads a Music file.
     */
    loadMusic(name: string, url: string): Promise<void>;
    /**
     * Plays a preloaded SFX.
     */
    playSFX(name: string): void;
    /**
     * Plays a preloaded Music file.
     */
    playMusic(name: string, options?: {
        loop?: boolean;
        volume?: number;
    }): void;
    /**
     * Stops the current music playback.
     */
    stopMusic(): void;
    /**
     * Sets the master volume level (0.0 to 1.0).
     */
    setMasterVolume(value: number): void;
    private loadBuffer;
}

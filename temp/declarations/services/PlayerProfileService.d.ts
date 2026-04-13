import { z } from "zod";
/**
 * Schema for the global player profile.
 */
export declare const PlayerProfileSchema: z.ZodObject<{
    playerId: z.ZodString;
    displayName: z.ZodString;
    xp: z.ZodNumber;
    level: z.ZodNumber;
    unlockedPalettes: z.ZodArray<z.ZodString>;
    activePalette: z.ZodString;
    unlockedTrails: z.ZodArray<z.ZodString>;
    activeTrail: z.ZodString;
    stats: z.ZodObject<{
        asteroidsDestroyed: z.ZodNumber;
        pipesPassed: z.ZodNumber;
        siKills: z.ZodNumber;
        pongSetsWon: z.ZodNumber;
        totalPlaytimeTicks: z.ZodNumber;
    }, z.core.$strip>;
    unlockedAchievements: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
/**
 * Service to manage the global player profile and progression.
 */
export declare class PlayerProfileService {
    private static profile;
    static getProfile(): Promise<PlayerProfile>;
    static addXP(amount: number): Promise<{
        leveledUp: boolean;
        newLevel: number;
    }>;
    private static checkUnlocks;
    static updateStats(_gameId: string, stats: Partial<PlayerProfile["stats"]>): Promise<void>;
    static setActivePalette(paletteId: string): Promise<void>;
    static saveProfile(): Promise<void>;
}

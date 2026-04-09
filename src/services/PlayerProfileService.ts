import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { XP_TABLE, LEVEL_THRESHOLDS } from "../config/PassportConfig";

/**
 * Schema for the global player profile.
 */
export const PlayerProfileSchema = z.object({
  playerId: z.string().uuid(),
  displayName: z.string().max(20),
  xp: z.number().int().nonnegative(),
  level: z.number().int().min(1),
  unlockedPalettes: z.array(z.string()),
  activePalette: z.string(),
  unlockedTrails: z.array(z.string()),
  activeTrail: z.string(),
  stats: z.object({
    asteroidsDestroyed: z.number().int(),
    pipesPassed: z.number().int(),
    siKills: z.number().int(),
    pongSetsWon: z.number().int(),
    totalPlaytimeTicks: z.number().int()
  }),
  unlockedAchievements: z.array(z.string()).default([]), // For Phase P2
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

const PROFILE_KEY = "player:profile";

/**
 * Service to manage the global player profile and progression.
 */
export class PlayerProfileService {
  private static profile: PlayerProfile | null = null;

  public static async getProfile(): Promise<PlayerProfile> {
    if (this.profile) return this.profile;

    const data = await AsyncStorage.getItem(PROFILE_KEY);
    if (data) {
      try {
        this.profile = PlayerProfileSchema.parse(JSON.parse(data));
        return this.profile!;
      } catch (e) {
        console.error("Failed to parse player profile", e);
      }
    }

    // Initialize default profile
    this.profile = {
      playerId: crypto.randomUUID(),
      displayName: "Jugador",
      xp: 0,
      level: 1,
      unlockedPalettes: ["palette_default"],
      activePalette: "palette_default",
      unlockedTrails: ["trail_default"],
      activeTrail: "trail_default",
      stats: {
        asteroidsDestroyed: 0,
        pipesPassed: 0,
        siKills: 0,
        pongSetsWon: 0,
        totalPlaytimeTicks: 0
      },
      unlockedAchievements: []
    };
    await this.saveProfile();
    return this.profile!;
  }

  public static async addXP(amount: number): Promise<{ leveledUp: boolean, newLevel: number }> {
    const profile = await this.getProfile();
    profile.xp += amount;

    let leveledUp = false;
    let nextLevel = profile.level + 1;
    while (nextLevel <= LEVEL_THRESHOLDS.length && profile.xp >= LEVEL_THRESHOLDS[nextLevel - 1]) {
      profile.level = nextLevel;
      leveledUp = true;
      nextLevel++;

      // Check for unlocks at this level
      this.checkUnlocks(profile.level);
    }

    await this.saveProfile();
    return { leveledUp, newLevel: profile.level };
  }

  private static checkUnlocks(level: number) {
    const { PALETTE_UNLOCKS, TRAIL_UNLOCKS } = require("../config/PassportConfig");
    if (PALETTE_UNLOCKS[level]) {
      PALETTE_UNLOCKS[level].forEach((p: string) => {
        if (!this.profile!.unlockedPalettes.includes(p)) {
          this.profile!.unlockedPalettes.push(p);
        }
      });
    }
    if (TRAIL_UNLOCKS[level]) {
      TRAIL_UNLOCKS[level].forEach((t: string) => {
        if (!this.profile!.unlockedTrails.includes(t)) {
          this.profile!.unlockedTrails.push(t);
        }
      });
    }
  }

  public static async updateStats(gameId: string, stats: Partial<PlayerProfile["stats"]>): Promise<void> {
    const profile = await this.getProfile();
    Object.entries(stats).forEach(([key, value]) => {
      (profile.stats as any)[key] += value;
    });
    await this.saveProfile();
  }

  public static async setActivePalette(paletteId: string): Promise<void> {
    const profile = await this.getProfile();
    if (profile.unlockedPalettes.includes(paletteId)) {
      profile.activePalette = paletteId;
      await this.saveProfile();
    }
  }

  public static async saveProfile(): Promise<void> {
    if (this.profile) {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
    }
  }
}

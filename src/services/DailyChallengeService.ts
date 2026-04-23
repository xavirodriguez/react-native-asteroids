import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

/**
 * Schema for a daily challenge attempt.
 */
export const DailyAttemptSchema = z.object({
  gameId: z.string(),
  dateKey: z.string(), // 'YYYYMMDD'
  score: z.number().int().nonnegative(),
  seed: z.number(),
  completedAt: z.number() // tick timestamp or internal counter
});

export type DailyAttempt = z.infer<typeof DailyAttemptSchema>;

/**
 * Service to manage daily challenges and seeds.
 */
export class DailyChallengeService {
  /**
   * Generates a reproducible seed for a specific game and date.
   */
  public static getDailySeed(gameId: string): number {
    const now = new Date();
    const dateKey = this.getDateKey(now);
    const dateNum = parseInt(dateKey, 10);

    // Simple hash for gameId
    let hash = 0;
    for (let i = 0; i < gameId.length; i++) {
      hash = ((hash << 5) - hash) + gameId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Combine date and gameId hash for the final seed
    return (dateNum ^ hash) >>> 0;
  }

  /**
   * Returns a YYYYMMDD string for the given date.
   */
  public static getDateKey(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  /**
   * Checks if the player has already used their attempt for today.
   */
  public static async hasTodayAttemptBeenUsed(gameId: string): Promise<boolean> {
    const dateKey = this.getDateKey();
    const key = `daily:${gameId}:${dateKey}`;
    const data = await AsyncStorage.getItem(key);
    return data !== null;
  }

  /**
   * Marks the daily attempt as used and stores the score.
   */
  public static async markAttemptAsUsed(gameId: string, score: number, seed: number, completedAt: number): Promise<void> {
    const dateKey = this.getDateKey();
    const key = `daily:${gameId}:${dateKey}`;
    const attempt: DailyAttempt = {
      gameId,
      dateKey,
      score,
      seed,
      completedAt
    };
    await AsyncStorage.setItem(key, JSON.stringify(attempt));
  }

  /**
   * Gets the stored score for today's attempt.
   */
  public static async getTodayScore(gameId: string): Promise<number | null> {
    const dateKey = this.getDateKey();
    const key = `daily:${gameId}:${dateKey}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    try {
      const attempt = JSON.parse(data);
      return attempt.score;
    } catch (_err) {
      return null;
    }
  }
}

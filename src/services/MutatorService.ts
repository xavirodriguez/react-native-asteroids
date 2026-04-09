import AsyncStorage from "@react-native-async-storage/async-storage";
import { MUTATORS, Mutator } from "../config/MutatorConfig";

const MUTATORS_ENABLED_KEY = "settings:mutators_enabled";

/**
 * Service to manage weekly mutators and their rotation.
 */
export class MutatorService {
  /**
   * Returns the mutators active for the current week.
   */
  public static getWeeklyMutators(): Mutator[] {
    const now = new Date();
    const weekNumber = this.getISOWeekNumber(now);

    // Select 2 mutators based on the week number
    const m1 = MUTATORS[weekNumber % MUTATORS.length];
    const m2 = MUTATORS[(weekNumber + 1) % MUTATORS.length];

    // Deduplicate if needed (though unlikely with current config)
    if (m1.id === m2.id) return [m1];

    return [m1, m2];
  }

  /**
   * Filters weekly mutators for a specific game.
   */
  public static getActiveMutatorsForGame(gameId: string): Mutator[] {
    const weekly = this.getWeeklyMutators();
    return weekly.filter(m => m.games.includes(gameId as any) || m.games.includes('all'));
  }

  /**
   * Checks if mutator mode is globally enabled by the player.
   */
  public static async isMutatorModeEnabled(): Promise<boolean> {
    const data = await AsyncStorage.getItem(MUTATORS_ENABLED_KEY);
    return data === null ? true : data === "true";
  }

  /**
   * Toggles the global mutator mode.
   */
  public static async setMutatorModeEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(MUTATORS_ENABLED_KEY, String(enabled));
  }

  /**
   * Helper to get the ISO week number.
   */
  private static getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

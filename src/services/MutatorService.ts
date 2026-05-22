import AsyncStorage from "@react-native-async-storage/async-storage";
import { MUTATORS, Mutator } from "../config/MutatorConfig";
import { ServerTimeService } from "./ServerTimeService";

const MUTATORS_ENABLED_KEY = "settings:mutators_enabled";

/**
 * Weekly Mutator Management Service.
 *
 * @responsibility Handle the selection and rotation of global gameplay mutators.
 * @responsibility Ensure cross-client seed consistency for periodic events.
 */
export class MutatorService {
  private static cachedMutators: Mutator[] | null = null;
  private static cachedSeed: string | number | null = null;
  private static lockedSeed: string | number | null = null;

  /**
   * Locks the current seed for the duration of a game session.
   */
  public static lockSessionSeed(forceSeed?: string | number): void {
    this.lockedSeed = forceSeed ?? ServerTimeService.getWeekSeed() ?? this.getISOWeekNumber(new Date(ServerTimeService.getCorrectedTime()));
  }

  /**
   * Unlocks the session seed.
   */
  public static unlockSessionSeed(): void {
    this.lockedSeed = null;
  }

  /**
   * Returns the mutators active for the current week.
   *
   * @param forceSeed - Optional seed to bypass server/local time logic.
   */
  public static getWeeklyMutators(forceSeed?: string | number): { mutators: Mutator[], source: 'server' | 'local-fallback' } {
    const seed = forceSeed ?? this.lockedSeed ?? ServerTimeService.getWeekSeed() ?? this.getISOWeekNumber(new Date(ServerTimeService.getCorrectedTime()));
    const source = (forceSeed || this.lockedSeed || ServerTimeService.isSynced()) ? 'server' as const : 'local-fallback' as const;

    // Cache to avoid recalculating every frame
    if (this.cachedSeed === seed && this.cachedMutators) {
      return { mutators: this.cachedMutators, source };
    }

    // Deterministic selection based on seed
    const hash = this.stringToHash(String(seed));
    const m1 = MUTATORS[Math.abs(hash) % MUTATORS.length];
    const m2 = MUTATORS[Math.abs(hash + 1) % MUTATORS.length];

    const mutators = m1.id === m2.id ? [m1] : [m1, m2];

    this.cachedSeed = seed;
    this.cachedMutators = mutators;

    return { mutators, source };
  }

  /**
   * Filters weekly mutators for a specific game.
   */
  public static getActiveMutatorsForGame(gameId: string, forceSeed?: string | number): Mutator[] {
    const { mutators } = this.getWeeklyMutators(forceSeed);
    return mutators.filter(m => m.games.includes(gameId as never) || m.games.includes('all'));
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
   * Simple hash function for string seeds.
   */
  private static stringToHash(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Calcula el número de semana ISO para una fecha dada (fallback).
   */
  private static getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

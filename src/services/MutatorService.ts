import AsyncStorage from "@react-native-async-storage/async-storage";
import { MUTATORS, Mutator } from "../config/MutatorConfig";

const MUTATORS_ENABLED_KEY = "settings:mutators_enabled";

/**
 * Weekly Mutator Management Service.
 *
 * @responsibility Handle the selection and rotation of global gameplay mutators.
 * @responsibility Ensure cross-client seed consistency for periodic events.
 *
 * @remarks
 * This service implements a deterministic rotation logic based on the UTC week number.
 * This guarantees that all players in a session see the same active mutators without
 * requiring constant server-to-client synchronization for the mutator list.
 *
 * @conceptualRisk [TIME_SYNC] Relies on the client system clock. Significant drifts may
 * cause a player to see the wrong active mutators for a short period during week rollover.
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
    return weekly.filter(m => m.games.includes(gameId as never) || m.games.includes('all'));
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
   * Calcula el número de semana ISO para una fecha dada.
   *
   * @remarks
   * Utiliza el estándar ISO 8601 donde la primera semana del año es la que contiene
   * el primer jueves del año. Este algoritmo garantiza una rotación determinista
   * de mutadores sincronizada entre todos los clientes del mundo.
   *
   * @param date - La fecha a evaluar.
   * @returns El número de semana [1-53].
   */
  private static getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

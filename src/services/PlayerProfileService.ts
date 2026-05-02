import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { LEVEL_THRESHOLDS, PALETTE_UNLOCKS, TRAIL_UNLOCKS } from "../config/PassportConfig";

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
 * Servicio encargado de gestionar el perfil global del jugador y su progresión.
 *
 * @remarks
 * Implementa la persistencia mediante {@link AsyncStorage} y valida los datos
 * utilizando esquemas de Zod para garantizar la integridad entre sesiones.
 * Gestiona el sistema de XP, niveles y desbloqueo de cosméticos (paletas y estelas).
 *
 * @conceptualRisk [ASYNC_RACE][LOW] Múltiples llamadas a `addXP` seguidas pueden
 * causar inconsistencia si no se espera a la resolución del `saveProfile`.
 */
export class PlayerProfileService {
  private static profile: PlayerProfile | null = null;

  /**
   * Recupera el perfil del jugador desde el almacenamiento persistente.
   * Si no existe, inicializa un perfil por defecto.
   */
  public static async getProfile(): Promise<PlayerProfile> {
    if (this.profile) return this.profile;

    const data = await AsyncStorage.getItem(PROFILE_KEY);
    if (data) {
      try {
        this.profile = PlayerProfileSchema.parse(JSON.parse(data));
        return this.profile!;
      } catch (_err) {
        console.error("Failed to parse player profile", _err);
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

  /**
   * Incrementa la experiencia del jugador y calcula posibles subidas de nivel.
   *
   * @remarks
   * El algoritmo de nivel es iterativo: comprueba el XP acumulado contra el array
   * `LEVEL_THRESHOLDS`. Cada subida de nivel dispara `checkUnlocks`.
   *
   * @param amount - Cantidad de XP a añadir.
   * @returns Un objeto indicando si subió de nivel y el nivel resultante.
   */
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

  public static async updateStats(_gameId: string, stats: Partial<PlayerProfile["stats"]>): Promise<void> {
    const profile = await this.getProfile();
    Object.entries(stats).forEach(([key, value]) => {
      if (value !== undefined) {
        const k = key as keyof PlayerProfile["stats"];
        profile.stats[k] += value;
      }
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

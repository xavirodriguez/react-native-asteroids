import { System } from "../core/System";
import { World } from "../core/World";
import { EventBus } from "../core/EventBus";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { XP_TABLE } from "../../config/PassportConfig";

/**
 * Componente para acumular puntos de experiencia (XP) durante una sesión de juego.
 * Actúa como un búfer temporal antes de persistir los datos al finalizar la partida.
 *
 * @responsibility Almacenar el XP pendiente de procesar en el perfil del jugador.
 */
export interface XPAccumulatorComponent {
  type: "XPAccumulator";
  /** XP acumulado en la sesión actual que aún no ha sido enviado al servicio de perfil. */
  pendingXP: number;
}

/**
 * Sistema de motor encargado de escuchar eventos de juego y traducirlos en ganancia de XP.
 * Gestiona la persistencia asíncrona al finalizar el estado de juego.
 *
 * @responsibility Escuchar hitos de gameplay y acumular XP en el perfil del jugador.
 *
 * API status: Public
 */
export class XPSystem extends System {
  private accumulator: XPAccumulatorComponent;
  private isDestroyed = false;
  private pendingStats: Partial<import("../../services/PlayerProfileService").PlayerProfile["stats"]> = {
    asteroidsDestroyed: 0,
    pipesPassed: 0,
    siKills: 0,
    pongSetsWon: 0,
    totalPlaytimeTicks: 0
  };

  /**
   * Inicializa el sistema de XP y configura los escuchas de eventos.
   *
   * @param eventBus - Bus de eventos global del motor para recibir señales de gameplay.
   */
  constructor(private eventBus: EventBus) {
    super();
    this.accumulator = { type: "XPAccumulator", pendingXP: 0 };
    this.setupListeners();
  }

  /**
   * Configura las suscripciones a eventos de diversos juegos para otorgar XP.
   */
  private setupListeners() {
    this.eventBus.on("asteroid:destroyed", (data: { size: string }) => {
      this.accumulator.pendingXP += data.size === "large"
        ? XP_TABLE.asteroid_large_destroyed
        : XP_TABLE.asteroid_destroyed;

      this.pendingStats.asteroidsDestroyed!++;
    });

    this.eventBus.on("asteroid:combo_changed", (data: { multiplier: number }) => {
      if (data.multiplier >= 5) this.accumulator.pendingXP += 25;
    });

    this.eventBus.on("flappy:near_miss", () => {
      this.accumulator.pendingXP += 10;
    });

    this.eventBus.on("pipe:passed", () => {
      this.accumulator.pendingXP += XP_TABLE.pipe_passed;
      this.pendingStats.pipesPassed!++;
    });

    this.eventBus.on("si:kill", (data: { chain: number }) => {
      this.accumulator.pendingXP += data.chain >= 5
        ? XP_TABLE.si_chain_kill
        : XP_TABLE.si_kill;

      this.pendingStats.siKills!++;
    });

    this.eventBus.on("si:boss_defeated", () => {
      this.accumulator.pendingXP += 200;
    });

    this.eventBus.on("pong:set_won", () => {
      this.accumulator.pendingXP += XP_TABLE.pong_set_won;
      this.pendingStats.pongSetsWon!++;
    });

    this.eventBus.on("pong:charged_smash", () => {
      this.accumulator.pendingXP += 5;
    });

    this.eventBus.on("game:over", async () => {
      if (this.isDestroyed) return;
      await this.flushPendingAsync();
    });
  }

  /**
   * Persiste el XP y las estadísticas acumuladas al servicio de perfil.
   * API status: Public
   */
  public async flushPendingAsync(): Promise<void> {
    if (this.accumulator.pendingXP > 0) {
        const { leveledUp, newLevel } = await PlayerProfileService.addXP(this.accumulator.pendingXP);
        if (leveledUp && !this.isDestroyed) {
          this.eventBus.emitDeferred("level:up", { level: newLevel });
        }
        this.accumulator.pendingXP = 0;
    }

    // Persist stats
    await PlayerProfileService.updateStats("all", this.pendingStats);

    // Reset pending stats
    for (const key in this.pendingStats) {
      if (Object.prototype.hasOwnProperty.call(this.pendingStats, key)) {
        (this.pendingStats as Record<string, number>)[key] = 0;
      }
    }
  }

  /**
   * Actualiza el sistema y asegura que el acumulador esté disponible en el mundo.
   */
  public update(world: World, _deltaTime: number): void {
    // Singleton registration if not present
    if (!world.getResource("XPAccumulator")) {
      world.setResource("XPAccumulator", this.accumulator);
    }

    // Accumulate playtime ticks
    this.pendingStats.totalPlaytimeTicks!++;
  }

  public override dispose(): void {
      this.isDestroyed = true;
      // We don't wait for flush here as it's async, but we could if BaseGame.destroy was async.
  }
}

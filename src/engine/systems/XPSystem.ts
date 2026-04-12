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
 * @queries Ninguna.
 * @mutates `XPAccumulatorComponent` (Resource).
 * @emits `level:up` cuando el servicio de perfil confirma un incremento de nivel.
 * @dependsOn `EventBus`, `PlayerProfileService`, `XP_TABLE`.
 * @executionOrder Logic Phase (independiente, pero suele ejecutarse al final de la lógica).
 * @conceptualRisk [ASYNC_RACE] El sistema dispara una llamada asíncrona a `PlayerProfileService` en el evento `game:over`.
 * Si el motor se destruye o se reinicia antes de que la promesa resuelva, el evento `level:up` podría emitirse en un contexto inválido.
 * @conceptualRisk [SINGLETON_DRIFT] Registra el acumulador como recurso en cada `update`, lo cual es redundante tras la primera ejecución.
 */
export class XPSystem extends System {
  private accumulator: XPAccumulatorComponent;

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
   *
   * @remarks
   * Los valores de XP se obtienen de `XP_TABLE`.
   * El evento `game:over` dispara la persistencia asíncrona.
   *
   * @sideEffect Modifica `this.accumulator.pendingXP` en respuesta a eventos.
   * @sideEffect Llama a `PlayerProfileService.addXP` (asíncrono) al recibir `game:over`.
   */
  private setupListeners() {
    this.eventBus.on("asteroid:destroyed", (data: { size: string }) => {
      this.accumulator.pendingXP += data.size === "large"
        ? XP_TABLE.asteroid_large_destroyed
        : XP_TABLE.asteroid_destroyed;
    });

    this.eventBus.on("asteroid:combo_changed", (data: { multiplier: number }) => {
      if (data.multiplier >= 5) this.accumulator.pendingXP += 25;
    });

    this.eventBus.on("flappy:near_miss", () => {
      this.accumulator.pendingXP += 10;
    });

    this.eventBus.on("pipe:passed", () => {
      this.accumulator.pendingXP += XP_TABLE.pipe_passed;
    });

    this.eventBus.on("si:kill", (data: { chain: number }) => {
      this.accumulator.pendingXP += data.chain >= 5
        ? XP_TABLE.si_chain_kill
        : XP_TABLE.si_kill;
    });

    this.eventBus.on("si:boss_defeated", () => {
      this.accumulator.pendingXP += 200;
    });

    this.eventBus.on("pong:set_won", () => {
      this.accumulator.pendingXP += XP_TABLE.pong_set_won;
    });

    this.eventBus.on("pong:charged_smash", () => {
      this.accumulator.pendingXP += 5;
    });

    this.eventBus.on("game:over", async () => {
      if (this.accumulator.pendingXP > 0) {
        const { leveledUp, newLevel } = await PlayerProfileService.addXP(this.accumulator.pendingXP);
        if (leveledUp) {
          this.eventBus.emit("level:up", { level: newLevel });
        }
        this.accumulator.pendingXP = 0;
      }
    });
  }

  /**
   * Actualiza el sistema y asegura que el acumulador esté disponible en el mundo.
   *
   * @param world - Referencia al mundo ECS.
   * @param deltaTime - Tiempo transcurrido desde el último frame (en ms).
   *
   * @precondition El objeto `world` debe estar inicializado.
   * @postcondition El recurso "XPAccumulator" estará presente en el mundo.
   *
   * @conceptualRisk [REDUNDANCY] Verificar la existencia del recurso en cada frame tiene un coste O(1) despreciable pero innecesario.
   */
  public update(world: World, deltaTime: number): void {
    // Singleton registration if not present
    if (!world.getResource("XPAccumulator")) {
      world.setResource("XPAccumulator", this.accumulator);
    }
  }
}

import { ComponentRegistry } from "./Component";
import { EventRegistry } from "../events/EventBus";
import { System, SystemPhase, SystemConfig } from "./System";
import { World, BlueprintRegistryMap } from "./World";
import { RandomService } from "../utils/RandomService";

/**
 * Orquesta y ejecuta los sistemas registrados del ECS de forma secuencial y ordenada por fases.
 *
 * @remarks
 * Administra el ciclo de vida de los sistemas durante la simulación de ticks,
 * agrupándolos y ejecutándolos según fases predefinidas (Input, Simulation, Transform, Collision, etc.)
 * y prioridades de ejecución específicas.
 *
 * @precondition Los sistemas agregados deben cumplir con el contrato de la clase `System`.
 * @postcondition Ejecuta las actualizaciones secuenciales de todos los sistemas y vacía los cambios diferidos en el World (`flush()`).
 * @invariant La lista de sistemas registrados se mantiene constante a menos que se invoque explicitamente a `clearSystems()`.
 * @conceptualRisk [LIFECYCLE] Invocar `update` simultáneamente o con un World destruido manipulará referencias inválidas u obsoletas de entidades.
 * @public
 */
export class Schedule<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents, TEvents> = BlueprintRegistryMap<TComponents, TEvents>
> {
  private systems: { system: System<TComponents, TEvents>; phase: string; priority: number }[] = [];
  private phases: string[];

  /**
   * Crea una nueva instancia de la agenda de ejecución (Schedule).
   *
   * @param phases - Lista personalizada de fases de ejecución ordenadas de forma secuencial.
   */
  constructor(phases?: string[]) {
    this.phases = phases ?? [
      SystemPhase.Input,
      SystemPhase.Simulation,
      SystemPhase.Transform,
      SystemPhase.Collision,
      SystemPhase.GameRules,
      SystemPhase.Presentation
    ];
  }

  /**
   * Registra un sistema en el Schedule y gatilla su callback `onRegister`.
   *
   * @precondition El sistema no debe estar nulo y el World debe ser una instancia activa y válida.
   * @postcondition El sistema se añade internamente de acuerdo a su fase y prioridad, y su callback `onRegister` es ejecutado.
   * @throws Ninguno.
   * @sideEffect Muta la lista de sistemas internos e invoca código externo mediante `system.onRegister`.
   *
   * @param system - El sistema a registrar.
   * @param config - Configuración de fase y prioridad del sistema.
   * @param world - El World de la simulación en donde se registra el sistema.
   */
  public addSystem(
    system: System<TComponents, TEvents>,
    config: SystemConfig = {},
    world: World<TComponents, TEvents, TBlueprints>
  ): void {
    this.systems.push({
      system,
      phase: (config.phase as string) ?? SystemPhase.Simulation,
      priority: config.priority ?? 0
    });
    system.onRegister(world);
  }

  /**
   * Obtiene todos los sistemas registrados actualmente en esta agenda de ejecución.
   *
   * @precondition Ninguna.
   * @postcondition Retorna una lista con todos los objetos de tipo `System` registrados.
   * @returns Un array de sistemas.
   */
  public getSystems(): System<TComponents, TEvents>[] {
    return this.systems.map(s => s.system);
  }

  /**
   * Dispone y elimina todos los sistemas de forma limpia.
   *
   * @remarks
   * Llama al callback `dispose()` o `destroy()` de cada sistema registrado antes de vaciar la colección interna.
   *
   * @precondition Ninguna.
   * @postcondition La agenda de sistemas queda vacía y sin referencias de sistemas.
   * @sideEffect Llama a `dispose()` en cada sistema y borra el contenido de `systems`.
   */
  public clearSystems(): void {
    this.systems.forEach(s => s.system.dispose());
    this.systems = [];
  }

  /**
   * Ejecuta la actualización periódica de todos los sistemas de acuerdo a su orden de fase y prioridad.
   *
   * @remarks
   * Desbloquea y bloquea los generadores pseudo-aleatorios del World (`RandomService`) de forma segura,
   * controla que las mutaciones estructurales se almacenen en buffer activando la bandera `world.isUpdating = true`,
   * y finalmente vacía la cola de comandos diferidos del World mediante `world.flush()`.
   *
   * @precondition El World debe estar activo y no destruido.
   * @postcondition Todos los sistemas ejecutan su lógica periódica secuencialmente y se vacían los comandos estructurales de entidades pendientes en el World.
   * @invariant El estado de actualización `world.isUpdating` se restaura de forma segura a `false` al finalizar la ejecución, incluso si ocurre un error.
   * @throws Propaga cualquier error surgido durante el ciclo de actualización de un sistema individual.
   * @sideEffect Cambia banderas internas de bloqueo del World, muta componentes y entidades, e invoca `flush()` al final.
   *
   * @param world - El World sobre el cual operar.
   * @param deltaTime - El paso de tiempo desde el último frame o tick.
   */
  public update(
    world: World<TComponents, TEvents, TBlueprints>,
    deltaTime: number
  ): void {
    world.isUpdating = true;
    if (world.gameplayRandom) {
      world.gameplayRandom.unlock();
    }
    try {
      for (const phase of this.phases) {
        const phaseSystems = this.systems
          .filter(s => s.phase === phase)
          .sort((a, b) => b.priority - a.priority);

        for (const reg of phaseSystems) {
          reg.system.update(world, deltaTime);
        }
      }
    } finally {
      world.isUpdating = false;
      if (world.gameplayRandom) {
        world.gameplayRandom.lock();
      }
    }
    world.flush();
  }
}

import { World } from "./World";

/**
 * Fases estándar para la ejecución de sistemas.
 *
 * @remarks
 * Los sistemas se ejecutan en el siguiente orden secuencial:
 * 1. `Input` - Procesamiento de entrada de usuario o red.
 * 2. `Simulation` - Física, integración de movimiento y estados básicos.
 * 3. `Collision` - Detección y resolución de colisiones.
 * 4. `GameRules` - Lógica de alto nivel (puntuación, vidas, condiciones de victoria/derrota).
 * 5. `Presentation` - Sonido, efectos visuales y preparación de datos para el renderer.
 */
export enum SystemPhase {
  Input = "Input",
  Simulation = "Simulation",
  Collision = "Collision",
  GameRules = "GameRules",
  Presentation = "Presentation",
}

/**
 * Configuration for registering a system.
 */
export interface SystemConfig {
  /** The phase in which the system should run. Defaults to {@link SystemPhase.Simulation}. */
  phase?: SystemPhase | string;
  /** Execution priority within the phase. Higher priority runs first. */
  priority?: number;
}

/**
 * Clase base abstracta para todos los sistemas en la arquitectura ECS.
 *
 * @remarks
 * Los sistemas son los poseedores de la lógica y el comportamiento del juego. A diferencia de
 * las entidades y componentes, los sistemas no almacenan estado propio (stateless), sino que
 * actúan sobre conjuntos de componentes filtrados mediante queries en el {@link World}.
 *
 * El orden de ejecución es crítico y se gestiona mediante {@link SystemPhase} y prioridades.
 *
 * @responsibility Encapsular la lógica de comportamiento del juego.
 * @responsibility Transformar el estado del mundo basándose en el paso del tiempo.
 */
export abstract class System {
  /**
   * Ejecuta la lógica del sistema para el tick de simulación actual.
   *
   * @param world - La instancia del {@link World} sobre la que opera el sistema.
   * @param deltaTime - Tiempo transcurrido desde el último tick en milisegundos.
   *
   * @remarks
   * El sistema debe consultar entidades relevantes mediante {@link World.query} y aplicar
   * transformaciones a sus componentes. Se recomienda no almacenar estado mutable dentro
   * del sistema para facilitar el soporte de multijugador y rebobinado.
   *
   * @precondition El `world` debe estar en un estado consistente.
   * @postcondition Las mutaciones realizadas deben mantener los invariantes de los componentes.
   * @sideEffect Puede crear/eliminar entidades, añadir/quitar componentes o emitir eventos.
   * @conceptualRisk [UNIT_CONSISTENCY][LOW] `deltaTime` se entrega en milisegundos. Algunos
   * cálculos físicos (como integraciones de velocidad) pueden esperar segundos, lo que
   * requiere una división manual por 1000.
   */
  abstract update(world: World, deltaTime: number): void;
}

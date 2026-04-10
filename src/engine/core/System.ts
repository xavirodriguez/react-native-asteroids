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
 * Clase base para todos los sistemas de juego en la arquitectura ECS.
 * Los sistemas implementan la lógica del juego procesando entidades que poseen conjuntos
 * específicos de componentes.
 *
 * @remarks
 * Los sistemas deben ser, en la medida de lo posible, sin estado (stateless), confiando
 * en los componentes del {@link World} o en sus recursos para almacenar datos.
 *
 * @responsibility Implementar la lógica de comportamiento (behavior) sobre grupos de entidades.
 * @responsibility Transformar el estado del mundo de forma determinista frame a frame.
 *
 * @contract Stateless: El sistema no debe almacenar estado interno que afecte la simulación;
 * debe depender exclusivamente del {@link World} y componentes para facilitar replays y salvado.
 *
 * @packageDocumentation
 */
export abstract class System {
  /**
   * Actualiza la lógica del sistema para un solo frame.
   *
   * @param world - El mundo ECS que contiene las entidades y componentes.
   * @param deltaTime - El tiempo transcurrido desde el último tick en milisegundos.
   *
   * @conceptualRisk [UNIT_CONSISTENCY][LOW] `deltaTime` se entrega en milisegundos. Algunos
   * cálculos físicos (como integraciones de velocidad) pueden esperar segundos, lo que
   * requiere una división manual por 1000.
   */
  abstract update(world: World, deltaTime: number): void;
}

/**
 * Base interface for all components.
 * Every component is expected to have a unique type discriminator.
 *
 * @remarks
 * Components are ideally POJOs (Plain Old JavaScript Objects) that hold data but no logic.
 * This structure facilitates serialization, snapshots, and state replication.
 * Systems process entities by filtering for these data structures.
 */
export interface Component {
  /**
   * Discriminator for the component type.
   * Must be unique across the engine and games.
   */
  type: string;
}

/**
 * Una versión genérica de un componente que permite el acceso a datos arbitrarios.
 * Útil para componentes cuya estructura exacta se define dinámicamente o fuera del core.
 *
 * @remarks
 * Esta versión genérica busca mejorar la seguridad de tipos al permitir especificar la estructura
 * de datos esperada. Se recomienda su uso con interfaces que describan POJOs simples para asegurar
 * la compatibilidad con el sistema de snapshots.
 *
 * @conceptualRisk [TYPE_SAFETY][LOW] El uso de tipos excesivamente genéricos puede debilitar
 * las validaciones en tiempo de compilación.
 *
 * Type parameter T: Estructura de datos que extiende un registro de valores serializables.
 */
export type GenericComponent<T extends Record<string, unknown> = Record<string, unknown>> = Component & T;

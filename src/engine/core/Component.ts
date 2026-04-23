/**
 * Base interface for all components.
 * Every component must have a type discriminator.
 *
 * @remarks
 * Components are POJOs (Plain Old JavaScript Objects) that hold data but no logic.
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
 * Útil para acceder a componentes cuya estructura no se conoce en tiempo de compilación (ej. GameState).
 *
 * @remarks
 * Esta versión genérica mejora la seguridad de tipos al permitir especificar la estructura esperada
 * de los datos. Se integra con el sistema de serialización al mantener la consistencia de tipos.
 *
 * @conceptualRisk [TYPE_SAFETY][LOW] Aunque es genérico, el uso inapropiado de tipos amplios
 * puede debilitar la seguridad. Úsese con tipos de datos específicos (POJOs).
 */
export type GenericComponent<T = Record<string, unknown>> = Component & T;

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
 * @conceptualRisk [TYPE_SAFETY][MEDIUM] El uso de `unknown` requiere casting explícito.
 * Se recomienda usar interfaces específicas siempre que sea posible.
 */
export interface GenericComponent extends Component {
  [key: string]: unknown;
}

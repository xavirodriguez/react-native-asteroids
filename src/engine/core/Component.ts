/**
 * Interfaz base para todos los componentes en la arquitectura ECS.
 *
 * @remarks
 * Los componentes son POJOs (Plain Old JavaScript Objects) que contienen exclusivamente
 * datos y estados, sin lógica de comportamiento. El {@link World} utiliza la propiedad
 * `type` para indexar y filtrar entidades de forma eficiente.
 *
 * Los componentes deben ser serializables para soportar snapshots y multijugador.
 * Se recomienda evitar referencias circulares o punteros a objetos complejos.
 *
 * @responsibility Almacenar datos de estado de forma atómica y pura.
 */
export interface Component {
  /**
   * Discriminador único para el tipo de componente.
   * Debe ser consistente en todo el motor y los juegos registrados.
   */
  type: string;
}

/**
 * Versión genérica de un componente que permite el acceso a datos arbitrarios.
 *
 * @remarks
 * Útil para interactuar con componentes cuya estructura exacta no se conoce en tiempo
 * de compilación o para tipos de estado dinámicos como `GameState`.
 *
 * @conceptualRisk [TYPE_SAFETY][MEDIUM] El uso de index signatures relaja las garantías
 * de TypeScript. Se debe preferir interfaces fuertemente tipadas siempre que sea posible.
 */
export interface GenericComponent extends Component {
  /** Acceso dinámico a propiedades del componente. */
  [key: string]: any;
}

/**
 * Interfaz base para todos los componentes del motor.
 * Cada componente debe tener un discriminador de tipo único.
 *
 * @remarks
 * Los componentes son POJOs (Plain Old JavaScript Objects) que contienen datos pero no lógica.
 * Los sistemas procesan entidades filtrando por estas estructuras de datos.
 *
 * @responsibility Almacenar el estado puro de un aspecto de la entidad (ej: posición, salud).
 *
 * @contract Data-Only: No debe contener métodos ni lógica compleja; solo propiedades escalares, arrays u objetos simples.
 */
export interface Component {
  /**
   * Discriminator for the component type.
   * Must be unique across the engine and games.
   */
  type: string;
}

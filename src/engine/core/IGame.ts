import type { World } from "./World";
import type { GameLoop } from "./GameLoop";

/**
 * Tipo genérico para los suscriptores de actualización del juego.
 *
 * @typeParam TGame - El tipo concreto del juego para permitir tipado fuerte en los listeners.
 */
export type UpdateListener<TGame> = (game: TGame) => void;

/**
 * Interfaz genérica fundamental que debe implementar cualquier instancia de juego.
 * Define el contrato de ciclo de vida y comunicación entre el motor y la capa de presentación.
 *
 * @responsibility Definir el contrato del ciclo de vida (start, stop, pause, destroy).
 * @responsibility Proveer acceso al estado del mundo y la lógica de finalización.
 * @responsibility Actuar como sumidero unificado para entradas de usuario (programáticas o UI).
 *
 * @remarks
 * Esta interfaz permite que componentes de React o sistemas externos interactúen con cualquier juego
 * sin conocer su lógica interna, facilitando el intercambio de escenas y la integración multijugador.
 *
 * @typeParam TGame - El tipo concreto de la clase de juego que implementa la interfaz.
 *
 * @conceptualRisk [ASYNC_LIFECYCLE] `restart` puede ser asíncrono. Invocaciones rápidas y sucesivas
 * podrían causar estados inconsistentes si el juego no maneja bloqueos de transición.
 */
export interface IGame<TGame = unknown> {
  isMultiplayer: boolean;
  /**
   * Inicia la ejecución del bucle de juego.
   * @contract Debe invocar a `GameLoop.start()`.
   */
  start(): void;

  /**
   * Detiene por completo la ejecución y el renderizado.
   * @contract Debe invocar a `GameLoop.stop()`.
   */
  stop(): void;

  /**
   * Pausa la simulación lógica manteniendo el estado actual.
   * @contract Los sistemas de simulación deben ignorar el tick si `isPausedState()` es true.
   */
  pause(): void;

  /**
   * Reanuda la simulación desde un estado pausado.
   */
  resume(): void;

  /**
   * Reinicia el juego a su estado inicial. Puede ser una operación asíncrona si carga recursos.
   * @param seed - Semilla opcional para inicializar el generador de números aleatorios.
   * @contract Debe garantizar la limpieza del {@link World} anterior antes de re-inicializar.
   */
  restart(seed?: number): void | Promise<void>;

  /**
   * Libera recursos y desconecta listeners; debe llamarse al desmontar el juego.
   * @contract Una vez destruido, cualquier llamada a `start()` o `update()` debe fallar o ser ignorada.
   */
  destroy(): void;

  /**
   * Obtiene la instancia actual del {@link World} (ECS).
   * @queries Estado actual de todas las entidades y componentes.
   */
  getWorld(): World;

  /**
   * Indica si el juego se encuentra en estado de pausa.
   */
  isPausedState(): boolean;

  /**
   * Indica si se ha alcanzado una condición terminal de fin de juego.
   */
  isGameOver(): boolean;

  /**
   * Establece el estado de las acciones de entrada (e.g., "shoot", "moveUp").
   * @mutates El componente de estado de entrada global o el sistema de entrada unificado.
   */
  setInput(input: Record<string, boolean>): void;

  /**
   * Suscribe un listener que se ejecutará en cada tick de actualización.
   * @param listener - Callback que recibe la instancia del juego.
   * @returns Función para cancelar la suscripción.
   */
  subscribe(listener: UpdateListener<TGame>): () => void;

  /**
   * Obtiene la instancia del {@link GameLoop} asociada.
   */
  getGameLoop(): GameLoop;

  /**
   * Devuelve un snapshot del estado actual del juego.
   * Cada implementación debe sobrescribir el tipo de retorno con su estado específico.
   * @contract El objeto devuelto debe ser serializable para soportar rollback/red.
   * @conceptualRisk [SERIALIZATION] Si el estado contiene referencias circulares o funciones, fallará en red.
   */
  getGameState(): unknown;

  /**
   * Returns the current gameplay seed.
   * @contract Debe ser el mismo seed usado para inicializar RandomService en el canal 'gameplay'.
   */
  getSeed(): number;

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  initializeRenderer(renderer: import("../rendering/Renderer").Renderer<unknown>): void;
}

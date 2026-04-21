import { InputController } from "./InputController";

/**
 * Gestor centralizado para manejar múltiples fuentes de entrada.
 *
 * @deprecated Usar {@link UnifiedInputSystem} para una gestión de entradas basada en acciones semánticas
 * y desacoplada de controladores específicos.
 *
 * @remarks
 * El InputManager mantiene una lista de InputController y agrega sus estados
 * en un único estado de entrada unificado mediante una operación OR lógica.
 *
 * @responsibility Agregar múltiples fuentes de entrada (Teclado, Touch, Red).
 * @responsibility Proporcionar un estado de entrada consolidado para los sistemas de juego.
 *
 * @conceptualRisk [STATE_CLOBBERING] Si dos controladores intentan escribir en la misma clave,
 * domina el que devuelva `true` (OR lógico).
 * @conceptualRisk [LIFECYCLE_MISMATCH] Si no se llama a `cleanup()`, los event listeners de los controladores
 * pueden causar fugas de memoria al cambiar de escena.
 */
export class InputManager<TInputState extends Record<string, boolean>> {
  private controllers: InputController<TInputState>[] = [];

  /**
   * Registra un controlador de entrada en el gestor e invoca su inicialización.
   * @param controller - El InputController a añadir.
   * @contract Llama a `controller.setup()` inmediatamente.
   * @mutates controllers
   */
  public addController(controller: InputController<TInputState>): void {
    controller.setup();
    this.controllers.push(controller);
  }

  /**
   * Elimina todos los controladores y libera sus recursos.
   * @contract Debe llamarse al destruir el juego o cambiar de contexto para evitar fugas de memoria.
   * @mutates controllers
   */
  public cleanup(): void {
    this.controllers.forEach((c) => c.cleanup());
    this.controllers = [];
  }

  /**
   * Clears all registered controllers without calling cleanup on them.
   * Useful when the controllers themselves are managed elsewhere.
   */
  public clearControllers(): void {
    this.controllers = [];
  }

  /**
   * Distributes manual input updates to all registered controllers.
   * Useful for touch or network-driven inputs.
   *
   * @param inputs - Partial set of input state to update.
   */
  public setInputs(inputs: Partial<TInputState>): void {
    this.controllers.forEach((c) => c.setInputs(inputs));
  }

  /**
   * Updates all registered controllers.
   * Useful for controllers that need to perceive the world or handle timing.
   */
  public update(world: import("../core/World").World, currentTime: number, tick?: number): void {
    this.controllers.forEach((c: unknown) => {
      const controller = c as Record<string, unknown>;
      if (typeof controller.update === "function") {
        (controller.update as (w: import("../core/World").World, t: number) => void)(world, currentTime);
      }
      if (tick !== undefined && typeof controller.setTick === "function") {
        (controller.setTick as (t: number) => void)(tick);
      }
    });
  }

  /**
   * Agrega los estados de entrada de todos los controladores registrados.
   * @returns El estado de entrada unificado.
   * @queries controllers
   * @remarks
   * Si múltiples controladores proporcionan un estado para la misma acción,
   * la acción se considera activa si es activa en AL MENOS un controlador (OR lógico).
   */
  public getCombinedInputs(): TInputState {
    return this.controllers.reduce(
      (acc, controller) => {
        const inputs = controller.getCurrentInputs();
        const combined = { ...acc };
        Object.keys(inputs).forEach(key => {
          (combined as Record<string, boolean>)[key] =
            (acc as Record<string, boolean>)[key] || (inputs as Record<string, boolean>)[key];
        });
        return combined;
      },
      {} as TInputState
    );
  }
}

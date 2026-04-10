import { InputController } from "./InputController";

/**
 * Gestor centralizado para manejar múltiples fuentes de entrada.
 * Agrega el estado de varios controladores en un único estado semántico.
 *
 * @deprecated Utilizar `UnifiedInputSystem` para nuevos desarrollos basado en acciones semánticas.
 *
 * @responsibility Mantener una lista de controladores de entrada.
 * @responsibility Consolidar el estado de entrada de todos los controladores registrados.
 *
 * @remarks
 * El InputManager permite que múltiples periféricos (teclado, touch, red) controlen
 * el mismo estado lógico del juego simultáneamente.
 *
 * @packageDocumentation
 */
export class InputManager<TInputState extends Record<string, boolean>> {
  private controllers: InputController<TInputState>[] = [];

  /**
   * Registra un controlador de entrada en el gestor.
   *
   * @param controller - El controlador a añadir (e.g., KeyboardController).
   *
   * @sideEffect Llama al método `setup()` del controlador.
   */
  public addController(controller: InputController<TInputState>): void {
    controller.setup();
    this.controllers.push(controller);
  }

  /**
   * Elimina todos los controladores y limpia sus recursos (listeners, buffers).
   */
  public cleanup(): void {
    this.controllers.forEach((c) => c.cleanup());
    this.controllers = [];
  }

  /**
   * Limpia los controladores registrados sin invocar su método cleanup.
   * Útil cuando el ciclo de vida de los controladores se gestiona externamente.
   */
  public clearControllers(): void {
    this.controllers = [];
  }

  /**
   * Distribuye actualizaciones manuales de estado a todos los controladores.
   *
   * @param inputs - Estado parcial a inyectar (e.g., desde red o UI táctil).
   */
  public setInputs(inputs: Partial<TInputState>): void {
    this.controllers.forEach((c) => c.setInputs(inputs));
  }

  /**
   * Actualiza todos los controladores registrados.
   *
   * @param world - El mundo ECS (para controladores reactivos).
   * @param currentTime - Tiempo actual del sistema.
   * @param tick - (Opcional) Número de tick actual para controladores deterministas.
   */
  public update(world: any, currentTime: number, tick?: number): void {
    this.controllers.forEach((c: any) => {
      if (typeof c.update === "function") {
        c.update(world, currentTime);
      }
      if (tick !== undefined && typeof c.setTick === "function") {
        c.setTick(tick);
      }
    });
  }

  /**
   * Consolida los estados de todos los controladores en uno solo.
   * Una acción se considera activa si está activa en AL MENOS un controlador (OR lógico).
   *
   * @returns El estado de entrada unificado.
   *
   * @conceptualRisk [INPUT_CONFLICT][LOW] No hay prioridad entre controladores;
   * cualquier controlador puede activar una acción.
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

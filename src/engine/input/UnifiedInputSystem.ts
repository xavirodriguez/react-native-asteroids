import { World } from "../core/World";
import { System } from "../core/System";
import { InputStateComponent, InputAction } from "../types/EngineTypes";

/**
 * Sistema de entrada unificado (Unified Input System) para el manejo de controles multiplataforma.
 * Mapea entradas crudas de hardware a acciones semánticas en un singleton `InputStateComponent`.
 *
 * @responsibility Traducir eventos de hardware (teclado, puntero, gamepad) a acciones abstractas.
 * @responsibility Mantener el componente singleton `InputState` actualizado en el `World`.
 * @responsibility Permitir la inyección manual de estados mediante overrides para red y UI.
 *
 * @remarks
 * El sistema desacopla la lógica del juego de los dispositivos físicos.
 * Soporta **Bindings** (mapeo N:1 de teclas a acción) y **Overrides** (inyección forzada de estado).
 * Los Overrides son críticos para implementar controles táctiles en móviles y replicación de red.
 *
 * ### Características:
 * 1. **Axis to Button**: Permite que ejes (ej. joystick) disparen acciones digitales.
 * 2. **Logical Overriding**: Los botones de UI de React pueden simular pulsaciones de teclas físicas.
 */
export class UnifiedInputSystem extends System {
  private bindings = new Map<InputAction, string[]>();
  private axisBindings = new Map<string, { pos: string[]; neg: string[] }>();
  private overrides = new Map<InputAction, boolean>();
  private axisOverrides = new Map<string, number>();
  private activeKeys = new Set<string>();
  private activeTouches = new Set<string>();

  private _onKeyDown = (e: KeyboardEvent) => this.activeKeys.add(e.code);
  private _onKeyUp = (e: KeyboardEvent) => this.activeKeys.delete(e.code);
  private _onPointerDown = () => this.activeTouches.add("TouchTap");
  private _onPointerUp = () => this.activeTouches.delete("TouchTap");

  constructor() {
    super();
    this.setupListeners();
  }

  /**
   * Vincula una acción semántica a una o más teclas crudas o gestos.
   *
   * @param action - Nombre de la acción semántica (e.g., "jump").
   * @param inputs - Array de strings representando entradas crudas (e.g., ["Space", "ArrowUp", "TouchTap"]).
   */
  public bind(action: InputAction, inputs: string[]): void {
    this.bindings.set(action, inputs);
  }

  /**
   * Vincula un eje a entradas crudas para direcciones positiva y negativa.
   *
   * @param axis - Nombre del eje (e.g., "horizontal").
   * @param pos - Entradas que activan el valor positivo (+1).
   * @param neg - Entradas que activan el valor negativo (-1).
   */
  public bindAxis(axis: string, pos: string[], neg: string[]): void {
    this.axisBindings.set(axis, { pos, neg });
  }

  /**
   * Sobrescribe programáticamente el estado de una acción semántica.
   * Este override persiste hasta que se cambie explícitamente o se limpie.
   *
   * @remarks
   * Útil para controlar el juego desde componentes de UI de React o para aplicar
   * inputs recibidos a través de la red en modo multijugador.
   *
   * @param action - La acción a sobrescribir.
   * @param isPressed - El nuevo estado de presión.
   */
  public setOverride(action: InputAction, isPressed: boolean): void {
    this.overrides.set(action, isPressed);
  }

  /**
   * Elimina un override previo para una acción, devolviendo el control al hardware.
   *
   * @param action - La acción cuyo override se desea eliminar.
   */
  public clearOverride(action: InputAction): void {
    this.overrides.delete(action);
  }

  /**
   * Sobrescribe programáticamente el valor de un eje.
   *
   * @param axis - Nombre del eje.
   * @param value - Valor del eje (típicamente entre -1 y 1).
   */
  public setAxisOverride(axis: string, value: number): void {
    this.axisOverrides.set(axis, value);
  }

  /**
   * Elimina un override previo para un eje.
   *
   * @param axis - El eje cuyo override se desea eliminar.
   */
  public clearAxisOverride(axis: string): void {
    this.axisOverrides.delete(axis);
  }

  private setupListeners(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    // Simple touch/click to action mapping for demo/basic usage
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  /**
   * Sincroniza el estado de las entradas activas con el componente `InputState` en el mundo.
   *
   * @remarks
   * Combina el estado detectado del hardware con los overrides programáticos configurados.
   * Si no existe un componente `InputState` en el mundo, el sistema intenta crearlo como un singleton.
   *
   * @param world - El mundo donde reside el componente de entrada.
   * @param _deltaTime - Tiempo transcurrido (en ms).
   *
   * @precondition Se espera que el `world` sea una instancia válida de World.
   * @postcondition El componente singleton {@link InputStateComponent} refleja las acciones
   * activas capturadas por el sistema.
   * @sideEffect Puede crear una nueva entidad si el singleton `InputState` no está presente.
   * @mutates world - Registra o actualiza el componente `InputState`.
   */
  public update(world: World, _deltaTime: number): void {
    let inputState = world.getSingleton<InputStateComponent>("InputState");

    if (!inputState) {
      const entity = world.createEntity();
      inputState = {
        type: "InputState",
        actions: new Map(),
        axes: new Map()
      };
      world.addComponent(entity, inputState);
    }

    // Update semantic actions based on bindings and active raw inputs
    this.bindings.forEach((inputs, action) => {
      const isRawPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      const isOverridden = this.overrides.get(action);
      const isPressed = isOverridden !== undefined ? (isRawPressed || isOverridden) : isRawPressed;

      inputState!.actions.set(action, isPressed);
    });

    // Ensure actions that are ONLY overridden (not bound) are also updated
    this.overrides.forEach((isPressed, action) => {
      if (!this.bindings.has(action)) {
        inputState!.actions.set(action, isPressed);
      }
    });

    // Update axes based on bindings and overrides
    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value -= 1;

      const override = this.axisOverrides.get(axis);
      const finalValue = override !== undefined ? override : value;

      inputState!.axes.set(axis, finalValue);
    });

    // Handle axis overrides that might not have bindings
    this.axisOverrides.forEach((value, axis) => {
        if (!this.axisBindings.has(axis)) {
            inputState!.axes.set(axis, value);
        }
    });
  }

  /**
   * Limpia los listeners de eventos globales registrados en `window`.
   *
   * @precondition Se recomienda llamar a este método cuando el motor se destruye con la intención de mitigar el riesgo de fugas de memoria.
   */
  public cleanup(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
  }

  /**
   * Devuelve una instantánea (snapshot) del estado semántico actual de la entrada.
   *
   * @remarks
   * Utilizado principalmente para enviar el estado de entrada a través de la red
   * en juegos multijugador.
   *
   * @returns Un objeto con la lista de acciones activas y el valor de los ejes.
   * @queries activeKeys, activeTouches, overrides - Lee el estado acumulado.
   *
   * @postcondition El estado devuelto incorpora tanto las entradas de hardware como los `overrides` lógicos.
   */
  public getInputState(): { actions: string[], axes: Record<string, number> } {
    const actionsSet = new Set<string>();
    const axes: Record<string, number> = {};

    // 1. Process hardware bindings combined with overrides (matching update() OR logic)
    this.bindings.forEach((inputs, action) => {
      const isRawPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      const isOverridden = this.overrides.get(action);
      const isPressed = isOverridden !== undefined ? (isRawPressed || isOverridden) : isRawPressed;

      if (isPressed) actionsSet.add(action);
    });

    // 2. Process logical overrides for actions that are NOT bound to hardware
    this.overrides.forEach((isPressed, action) => {
      if (!this.bindings.has(action) && isPressed) {
        actionsSet.add(action);
      }
    });

    const actions = Array.from(actionsSet).sort();

    // 3. Process axis bindings and overrides
    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value -= 1;

      const override = this.axisOverrides.get(axis);
      const finalValue = override !== undefined ? override : value;

      if (finalValue !== 0) axes[axis] = finalValue;
    });

    // 4. Process axis overrides that are NOT bound
    this.axisOverrides.forEach((value, axis) => {
        if (!this.axisBindings.has(axis) && value !== 0) {
            axes[axis] = value;
        }
    });

    return { actions, axes };
  }
}

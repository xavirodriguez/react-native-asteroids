import { InputController } from "./InputController";

/**
 * Mapeo entre códigos de eventos de teclado y acciones de entrada.
 */
export interface KeyMap<TInputState extends Record<string, boolean>> {
  [keyCode: string]: keyof TInputState;
}

/**
 * Implementación de controlador que utiliza eventos de teclado del navegador.
 *
 * @responsibility Escuchar eventos nativos de teclado y mapearlos a acciones lógicas del juego.
 * @executionOrder Fase: Entrada (Input).
 *
 * @conceptualRisk [KEYBOARD_MISMATCH][LOW] Depende de `e.code`, que es independiente del layout físico (QWERTY vs DVORAK),
 * pero puede variar entre navegadores o sistemas operativos antiguos.
 */
export class KeyboardController<TInputState extends Record<string, boolean>>
  extends InputController<TInputState> {

  /** Conjunto de teclas actualmente presionadas (códigos e.code). */
  private keys = new Set<string>();
  private keyMap: KeyMap<TInputState>;
  private defaultState: TInputState;

  constructor(keyMap: KeyMap<TInputState>, defaultState: TInputState) {
    super();
    this.keyMap = keyMap;
    this.defaultState = defaultState;
    this.inputs = { ...defaultState };
  }

  /**
   * Conecta los listeners de `keydown` y `keyup` al objeto global window.
   */
  setup(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Elimina los listeners de teclado del objeto window.
   */
  cleanup(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Manejador interno para eventos de pulsación de tecla.
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    this.updateInputs();
  };

  /**
   * Manejador interno para eventos de liberación de tecla.
   */
  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    this.updateInputs();
  };

  /**
   * Sincroniza el estado de las teclas pulsadas con el objeto de entrada TInputState.
   *
   * @invariant Las acciones no mapeadas mantienen su valor por defecto definido en `defaultState`.
   */
  private updateInputs(): void {
    const next = { ...this.defaultState };
    this.keys.forEach(code => {
      const action = this.keyMap[code];
      if (action !== undefined) {
        (next as Record<string, boolean>)[action as string] = true;
      }
    });
    this.inputs = next;
  }
}

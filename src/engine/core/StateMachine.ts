/**
 * Interfaz que define un estado individual dentro de la máquina de estados.
 *
 * @typeParam _TState - Unión de strings que definen las claves de estado posibles.
 * @typeParam TContext - Tipo del objeto de contexto compartido entre estados.
 */
export interface State<_TState extends string, TContext> {
  /** Hook invocado al entrar en el estado. */
  onEnter?: (ctx: TContext) => void;
  /** Hook invocado en cada actualización del motor mientras el estado está activo. */
  onUpdate?: (ctx: TContext, dt: number) => void;
  /** Hook invocado justo antes de salir del estado hacia una transición. */
  onExit?: (ctx: TContext) => void;
}

/**
 * Configuración necesaria para inicializar una máquina de estados.
 */
export interface StateMachineConfig<TState extends string, TContext> {
  /** Clave del estado inicial. */
  initial: TState;
  /** Diccionario de definiciones de estado. */
  states: {
    [K in TState]: State<TState, TContext>;
  };
}

/**
 * Implementación genérica de Máquina de Estados Finitos (FSM).
 *
 * @responsibility Gestionar el estado actual y las transiciones basadas en eventos o lógica.
 * @responsibility Ejecutar hooks de ciclo de vida (`onEnter`, `onUpdate`, `onExit`) de forma consistente.
 *
 * @typeParam TState - Claves de estado permitidas.
 * @typeParam TContext - Contexto persistente inyectado en los hooks.
 *
 * @contract Transición: Al cambiar de estado, se garantiza el orden: `old.onExit` -\> `new.onEnter`.
 * @contract Unicidad: No se puede transicionar al mismo estado en el que se encuentra la máquina.
 *
 * @conceptualRisk [CONTEXT_MUTATION][LOW] El contexto es mutable por referencia; los estados
 * deben ser cuidadosos al modificar propiedades compartidas para evitar efectos secundarios imprevistos.
 */
export class StateMachine<TState extends string, TContext> {
  private currentStateKey: TState;
  private config: StateMachineConfig<TState, TContext>;
  private context: TContext;

  constructor(config: StateMachineConfig<TState, TContext>, context: TContext) {
    this.config = config;
    this.context = context;
    this.currentStateKey = config.initial;
    this.config.states[this.currentStateKey]?.onEnter?.(this.context);
  }

  public transition(newStateKey: TState): void {
    if (this.currentStateKey === newStateKey) return;

    this.config.states[this.currentStateKey]?.onExit?.(this.context);
    this.currentStateKey = newStateKey;
    this.config.states[this.currentStateKey]?.onEnter?.(this.context);
  }

  public update(dt: number): void {
    this.config.states[this.currentStateKey]?.onUpdate?.(this.context, dt);
  }

  public getCurrentState(): TState {
    return this.currentStateKey;
  }
}

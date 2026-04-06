/**
 * Generic State Machine (FSM) implementation.
 */
export interface State<TState extends string, TContext> {
  onEnter?: (ctx: TContext) => void;
  onUpdate?: (ctx: TContext, dt: number) => void;
  onExit?: (ctx: TContext) => void;
}

export interface StateMachineConfig<TState extends string, TContext> {
  initial: TState;
  states: {
    [K in TState]: State<TState, TContext>;
  };
}

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

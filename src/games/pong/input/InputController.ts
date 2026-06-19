/**
 * Abstract base class for input controllers.
 */
export abstract class InputController<T extends Record<string, unknown>> {
  protected inputs: T = {} as T;

  public abstract setup(): void;
  public abstract cleanup(): void;

  protected setInputs(inputs: T): void {
    this.inputs = { ...this.inputs, ...inputs };
  }

  public getInputs(): T {
    return this.inputs;
  }
}

import { PredictedState } from "./NetTypes";

export class PredictionBuffer {
  private buffer: PredictedState[] = [];
  private maxSize: number;

  constructor(maxSize: number = 120) {
    this.maxSize = maxSize;
  }

  public save(state: PredictedState): void {
    this.buffer.push(state);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  public getAt(tick: number): PredictedState | undefined {
    return this.buffer.find((s) => s.tick === tick);
  }

  public clearBefore(tick: number): void {
    this.buffer = this.buffer.filter((s) => s.tick > tick);
  }

  public clear(): void {
    this.buffer = [];
  }

  public getLast(): PredictedState | undefined {
    return this.buffer[this.buffer.length - 1];
  }
}

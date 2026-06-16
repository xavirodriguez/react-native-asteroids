export interface InputFrame {
  tick: number;
  actions: string[];
  axes: Record<string, number>;
}
export interface ReplayFrame {
  tick: number;
  inputs: Record<string, InputFrame[]>;
  events: any[];
}

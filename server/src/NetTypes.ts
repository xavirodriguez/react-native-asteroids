export interface InputFrame {
  protocolVersion?: number;
  tick: number;
  timestamp?: number;
  actions: string[];
  axes: Record<string, number>;
}
export interface ReplayFrame {
  tick: number;
  inputs: Record<string, InputFrame[]>;
  events: any[];
}

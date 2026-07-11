import { InputFrame as NetInputFrame } from "@tiny-aster/network";

export type InputFrame = NetInputFrame;

export interface ReplayFrame {
  tick: number;
  inputs: Record<string, InputFrame[]>;
  events: any[];
}

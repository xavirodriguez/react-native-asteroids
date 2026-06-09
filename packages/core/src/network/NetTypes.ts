import { Entity } from "../ecs/Entity";

export interface InputFrame {
  tick: number;
  input: any;
}

export interface ReplayFrame {
  tick: number;
  inputs: Record<Entity, any>;
  events: any[];
}

export interface ReplayData {
  version: number;
  roomId: string;
  startTick: number;
  endTick: number;
  frames: ReplayFrame[];
}

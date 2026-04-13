import { Component, Entity } from "./EngineTypes";

export interface InputBufferComponent extends Component {
  type: "InputBuffer";
  bufferedAction: string | null;
  bufferTimer: number;
  bufferDuration: number;
}

export function createInputBufferComponent(duration: number = 80): InputBufferComponent {
  return {
    type: "InputBuffer",
    bufferedAction: null,
    bufferTimer: 0,
    bufferDuration: duration,
  };
}

import { Component } from "./EngineTypes";
export interface InputBufferComponent extends Component {
    type: "InputBuffer";
    bufferedAction: string | null;
    bufferTimer: number;
    bufferDuration: number;
}
export declare function createInputBufferComponent(duration?: number): InputBufferComponent;

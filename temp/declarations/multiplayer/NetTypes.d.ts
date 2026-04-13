export interface InputFrame {
    tick: number;
    timestamp: number;
    actions: string[];
    axes: Record<string, number>;
}
export interface PredictedState {
    tick: number;
    entityId: string;
    state: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        angle?: number;
    };
}
export interface EntitySnapshot {
    tick: number;
    x: number;
    y: number;
    angle?: number;
    timestamp: number;
}
export interface ReplayFrame {
    tick: number;
    inputs: Record<string, InputFrame[]>;
    events: string[];
}
export interface ReplayData {
    version: number;
    roomId: string;
    startTick: number;
    endTick: number;
    frames: ReplayFrame[];
}

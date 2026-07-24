import { CoreComponentRegistry } from "../ecs/CoreComponents";

/** @public */
export interface MultiplayerRegistry extends CoreComponentRegistry {
    RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
    LocalPlayer: { type: "LocalPlayer" };
    Input: {
        type: "Input";
        thrust?: boolean;
        rotateLeft?: boolean;
        rotateRight?: boolean;
        shoot?: boolean;
        hyperspace?: boolean;
        rotationAmount?: number;
    };
}

/** @public */
export interface ReconciledInput<TInput = {
    thrust?: boolean;
    rotateLeft?: boolean;
    rotateRight?: boolean;
    shoot?: boolean;
    hyperspace?: boolean;
    rotationAmount?: number;
}> {
    tick: number;
    input: TInput;
    state: { x: number; y: number; vx: number; vy: number };
    dt: number;
}

/** @public */
export interface AuthoritativeServerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

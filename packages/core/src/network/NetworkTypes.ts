import { World } from "../ecs/World";
import { InputFrame } from "./NetTypes";

/**
 * Interface representing the game instance during network reconciliation.
 */
export interface INetworkGame {
    /** Run a single simulation step. */
    runSimulationStep(deltaTime: number, isResimulating: boolean): void;
    /** Get the current authoritative world state. */
    getWorld(): World;
    /** Apply input frame to a specific entity. */
    applyInputToEntity(entityId: number, input: InputFrame): void;
}

/**
 * Configuration for the NetworkSystem.
 */
export interface NetworkConfig {
    /** Delay in milliseconds for interpolation of remote entities. */
    interpolationDelay?: number;
    /** Maximum number of history frames to keep for rollback. */
    maxHistory?: number;
    /** Fixed delay in ticks for local input application. */
    inputDelayTicks?: number;
    /** Whether to enable debug logging for reconciliation. */
    debug?: boolean;
}

/**
 * Interface for predicting the local player's state.
 */
export interface PredictionData {
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

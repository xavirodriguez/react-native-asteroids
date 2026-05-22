import { World } from "../core/World";
import { WorldSnapshot } from "../types/EngineTypes";
import { InputFrame } from "../../multiplayer/NetTypes";

/**
 * Interface for network reconciliation and interpolation strategies.
 */
export interface ReconciliationStrategy {
    /**
     * Called every frame in the Presentation phase.
     */
    update(world: World, deltaTime: number): void;

    /**
     * Called when a new authoritative snapshot is received from the server.
     */
    processServerUpdate(serverTick: number, authoritativeSnapshot: WorldSnapshot, localSessionId?: string): void;

    /**
     * Records a prediction step (optional, used by FullReconciliation).
     */
    recordPrediction?(input: InputFrame, world: World): void;

    /**
     * Retrieves a state snapshot from history (optional).
     */
    getStateHistory?(tick: number): WorldSnapshot | undefined;

    /**
     * Resets the strategy state.
     */
    reset(): void;
}

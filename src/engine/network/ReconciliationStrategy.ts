import { World } from "../core/World";
import { WorldSnapshot } from "../types/EngineTypes";
import { InputFrame } from "../../multiplayer/NetTypes";

/**
 * Interface for network reconciliation and interpolation strategies.
 *
 * @remarks
 * Strategies implementing this interface define how the local world state
 * is synchronized with authoritative server updates. Common implementations
 * include Rollback (prediction + rewind) and Snapshot Interpolation.
 *
 * Each strategy is expected to manage its own internal buffers and history
 * to maintain consistency based on its specific requirements.
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

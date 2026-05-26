import { WorldSnapshot } from "../types/EngineTypes";
import { PredictedState } from "../../multiplayer/NetTypes";

export interface DesyncThresholds {
    position: number;
    rotation: number;
    velocity: number;
}

/**
 * Encapsulates the logic for detecting divergences between predicted and authoritative states.
 *
 * @remarks
 * Desync detection is based on heuristic thresholds for spatial properties.
 * Small divergences are expected due to floating-point variability or differences
 * in execution timing. The detector aims to identify significant drifts that
 * require state reconciliation.
 */
export class DesyncDetector {
    private thresholds: DesyncThresholds;

    constructor(thresholds: Partial<DesyncThresholds> = {}) {
        this.thresholds = {
            position: thresholds.position ?? 0.1,
            rotation: thresholds.rotation ?? 0.01,
            velocity: thresholds.velocity ?? 0.1
        };
    }

    /**
     * Compares a predicted state with an authoritative snapshot for a specific entity.
     *
     * @remarks
     * A desync is flagged if the difference between predicted and authoritative
     * values exceeds the configured thresholds. Note that frequent or overly sensitive
     * detection may trigger unnecessary rollbacks, impacting performance.
     *
     * @param predicted - The state that was predicted locally.
     * @param authoritativeSnapshot - The authoritative state received from the server.
     * @param entityId - The entity ID to compare.
     * @returns true if a desync is detected, false otherwise.
     */
    public isDesynced(
        predicted: PredictedState,
        authoritativeSnapshot: WorldSnapshot,
        entityId: number
    ): boolean {
        const authTransform = authoritativeSnapshot.componentData["Transform"]?.[entityId];
        const authVelocity = authoritativeSnapshot.componentData["Velocity"]?.[entityId];

        if (!authTransform) return true; // Entity missing in server snapshot but exists locally

        // Position check
        const dx = predicted.state.x - (authTransform.x as number);
        const dy = predicted.state.y - (authTransform.y as number);
        const distSq = dx * dx + dy * dy;

        if (distSq > this.thresholds.position * this.thresholds.position) {
            return true;
        }

        // Rotation check
        if (predicted.state.angle !== undefined && authTransform.rotation !== undefined) {
            let diff = predicted.state.angle - (authTransform.rotation as number);
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            if (Math.abs(diff) > this.thresholds.rotation) {
                return true;
            }
        }

        // Velocity check
        if (authVelocity) {
            const dvx = predicted.state.vx - (authVelocity.dx as number);
            const dvy = predicted.state.vy - (authVelocity.dy as number);
            const velDistSq = dvx * dvx + dvy * dvy;

            if (velDistSq > this.thresholds.velocity * this.thresholds.velocity) {
                return true;
            }
        }

        return false;
    }

    /**
     * Finds an entity ID in an authoritative snapshot by its sessionId.
     */
    public findEntityBySessionId(snapshot: WorldSnapshot, sessionId: string): number | undefined {
        for (const type in snapshot.componentData) {
            const map = snapshot.componentData[type];
            for (const id in map) {
                const comp = map[id] as Record<string, unknown>;
                if (comp['sessionId'] === sessionId) {
                    return parseInt(id);
                }
            }
        }
        return undefined;
    }
}

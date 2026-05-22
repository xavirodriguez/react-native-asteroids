import { World } from "../../core/World";
import { WorldSnapshot, TransformComponent } from "../../types/EngineTypes";
import { ReconciliationStrategy } from "../ReconciliationStrategy";
import { InterpolationBuffer } from "../../../multiplayer/InterpolationSystem";

/**
 * Hybrid Authority Strategy.
 * Authoritative for some entities (e.g. swarm/enemies) and predicted for others (local player).
 * Used for games like Space Invaders.
 */
export class HybridAuthorityStrategy implements ReconciliationStrategy {
    private entityInterpolationBuffers = new Map<number, InterpolationBuffer>();
    private interpolationDelay: number;

    constructor(config: { interpolationDelay?: number } = {}) {
        this.interpolationDelay = config.interpolationDelay ?? 100;
    }

    public update(world: World, _deltaTime: number): void {
        const targetTime = Date.now() - this.interpolationDelay;
        const localPlayer = world.query("Tag").find(e => {
            const tag = world.getComponent(e, "Tag") as import("../../types/EngineTypes").TagComponent;
            return tag.tags.includes("LocalPlayer");
        });

        this.entityInterpolationBuffers.forEach((buffer, entityId) => {
            if (localPlayer !== undefined && entityId === localPlayer) return; // Local player is handled by prediction or direct state
            if (!world.hasEntity(entityId)) {
                this.entityInterpolationBuffers.delete(entityId);
                return;
            }

            const data = buffer.getAt(targetTime);
            if (data) {
                world.mutateComponent(entityId, "Transform", (transform: TransformComponent) => {
                    transform.x = data.prev.x + (data.next.x - data.prev.x) * data.alpha;
                    transform.y = data.prev.y + (data.next.y - data.prev.y) * data.alpha;
                });
            }
        });
    }

    public processServerUpdate(_serverTick: number, authoritativeSnapshot: WorldSnapshot, _localSessionId?: string): void {
        const timestamp = Date.now();

        authoritativeSnapshot.entities.forEach(entityId => {
            const transform = authoritativeSnapshot.componentData["Transform"]?.[entityId];
            if (!transform) return;

            let buffer = this.entityInterpolationBuffers.get(entityId);
            if (!buffer) {
                buffer = new InterpolationBuffer();
                this.entityInterpolationBuffers.set(entityId, buffer);
            }

            buffer.push({
                tick: authoritativeSnapshot.tick || 0,
                x: transform.x as number,
                y: transform.y as number,
                timestamp
            });
        });
    }

    public reset(): void {
        this.entityInterpolationBuffers.clear();
    }
}

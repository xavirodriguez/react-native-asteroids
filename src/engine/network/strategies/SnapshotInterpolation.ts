import { World } from "../../core/World";
import { WorldSnapshot, TransformComponent } from "../../types/EngineTypes";
import { ReconciliationStrategy } from "../ReconciliationStrategy";
import { InterpolationBuffer } from "../../../multiplayer/InterpolationSystem";

/**
 * Strategy for smooth interpolation of entities based on server snapshots.
 * Used for games like Flappy Bird.
 */
export class SnapshotInterpolationStrategy implements ReconciliationStrategy {
    private entityInterpolationBuffers = new Map<number, InterpolationBuffer>();
    private interpolationDelay: number;

    constructor(config: { interpolationDelay?: number } = {}) {
        this.interpolationDelay = config.interpolationDelay ?? 100;
    }

    public update(world: World, _deltaTime: number): void {
        const targetTime = Date.now() - this.interpolationDelay;

        this.entityInterpolationBuffers.forEach((buffer, entityId) => {
            if (!world.hasEntity(entityId)) {
                this.entityInterpolationBuffers.delete(entityId);
                return;
            }

            const data = buffer.getAt(targetTime);
            if (data) {
                world.mutateComponent(entityId, "Transform", (transform: TransformComponent) => {
                    transform.x = data.prev.x + (data.next.x - data.prev.x) * data.alpha;
                    transform.y = data.prev.y + (data.next.y - data.prev.y) * data.alpha;

                    if (data.prev.angle !== undefined && data.next.angle !== undefined) {
                        let diff = data.next.angle - data.prev.angle;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        transform.rotation = data.prev.angle + diff * data.alpha;
                    }
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
                angle: transform.rotation as number,
                timestamp
            });
        });
    }

    public reset(): void {
        this.entityInterpolationBuffers.clear();
    }
}

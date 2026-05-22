import { World } from "../../core/World";
import { WorldSnapshot, TransformComponent, VelocityComponent, VisualOffsetComponent, TagComponent } from "../../types/EngineTypes";
import { ReconciliationStrategy } from "../ReconciliationStrategy";
import { INetworkGame, NetworkConfig } from "../types/NetworkTypes";
import { PredictionBuffer } from "../../../multiplayer/PredictionBuffer";
import { InputFrame } from "../../../multiplayer/NetTypes";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { InterpolationBuffer } from "../../../multiplayer/InterpolationSystem";

/**
 * Strategy for full prediction and rollback reconciliation.
 * Used for fast-paced games like Asteroids.
 */
export class FullReconciliationStrategy implements ReconciliationStrategy {
    private predictionBuffer = new PredictionBuffer();
    private entityInterpolationBuffers = new Map<string, InterpolationBuffer>();
    private inputHistory: InputFrame[] = [];
    private stateHistory = new Map<number, WorldSnapshot>();
    private lastAuthoritativeTick = 0;
    private interpolationDelay: number;
    private maxHistory: number;

    constructor(private game: INetworkGame, config: NetworkConfig = {}) {
        this.interpolationDelay = config.interpolationDelay ?? 100;
        this.maxHistory = config.maxHistory ?? 120;
    }

    public update(world: World, _deltaTime: number): void {
        if (this.entityInterpolationBuffers.size === 0) return;

        const targetTime = Date.now() - this.interpolationDelay;
        const localPlayer = world.query("Tag").find(e => {
            const tag = world.getComponent(e, "Tag") as TagComponent;
            return tag && tag.tags.includes("LocalPlayer");
        });

        this.entityInterpolationBuffers.forEach((buffer, idStr) => {
            const entityId = parseInt(idStr);
            if (entityId === localPlayer) return;

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

    public processServerUpdate(serverTick: number, authoritativeSnapshot: WorldSnapshot, localSessionId?: string): void {
        if (serverTick <= this.lastAuthoritativeTick) return;
        this.lastAuthoritativeTick = serverTick;

        // Update interpolation buffers
        const timestamp = Date.now();
        authoritativeSnapshot.entities.forEach(entityId => {
            const id = entityId.toString();
            const transform = authoritativeSnapshot.componentData["Transform"]?.[entityId];
            if (!transform) return;

            let buffer = this.entityInterpolationBuffers.get(id);
            if (!buffer) {
                buffer = new InterpolationBuffer();
                this.entityInterpolationBuffers.set(id, buffer);
            }

            buffer.push({
                tick: authoritativeSnapshot.tick || 0,
                x: transform.x as number,
                y: transform.y as number,
                angle: transform.rotation as number,
                timestamp
            });
        });

        this.performReconciliation(serverTick, authoritativeSnapshot, localSessionId);
    }

    private performReconciliation(serverTick: number, authoritativeSnapshot: WorldSnapshot, localSessionId?: string) {
        const world = this.game.getWorld();
        const predicted = this.predictionBuffer.getAt(serverTick);

        this.setStateHistory(serverTick, authoritativeSnapshot);

        let needsRollback = false;
        let localPlayerId: number | undefined;

        if (!predicted) {
            needsRollback = true;
        } else {
            if (localSessionId) {
                // Find local player by sessionId in ANY component
                for (const type in authoritativeSnapshot.componentData) {
                    const map = authoritativeSnapshot.componentData[type];
                    for (const id in map) {
                        const comp = map[id] as Record<string, unknown>;
                        if (comp['sessionId'] === localSessionId) {
                            localPlayerId = parseInt(id);
                            break;
                        }
                    }
                    if (localPlayerId !== undefined) break;
                }

                if (localPlayerId !== undefined) {
                    const aPos = authoritativeSnapshot.componentData["Transform"]?.[localPlayerId];
                    if (!aPos ||
                        Math.abs(predicted.state.x - (aPos.x as number)) > 0.1 ||
                        Math.abs(predicted.state.y - (aPos.y as number)) > 0.1 ||
                        Math.abs((predicted.state.angle ?? 0) - (aPos.rotation as number ?? 0)) > 0.01) {
                        needsRollback = true;
                    }
                }
            }
        }

        if (!predicted && localSessionId) {
            // Find local player in server snapshot
            for (const type in authoritativeSnapshot.componentData) {
                const map = authoritativeSnapshot.componentData[type];
                for (const id in map) {
                    const comp = map[id] as Record<string, unknown>;
                    if (comp['sessionId'] === localSessionId) {
                        localPlayerId = parseInt(id);
                        break;
                    }
                }
                if (localPlayerId !== undefined) break;
            }
        }

        if (needsRollback) {
            const visualMismatches = new Map<number, { x: number, y: number }>();
            if (localPlayerId !== undefined) {
                const currentTrans = world.getComponent<TransformComponent>(localPlayerId, "Transform");
                if (currentTrans) {
                    visualMismatches.set(localPlayerId, { x: currentTrans.x, y: currentTrans.y });
                }
            }

            world.restore(authoritativeSnapshot);

            if (localPlayerId !== undefined) {
                const aPos = authoritativeSnapshot.componentData["Transform"]?.[localPlayerId];
                const aVel = authoritativeSnapshot.componentData["Velocity"]?.[localPlayerId];
                if (aPos && aVel) {
                    this.predictionBuffer.save({
                        tick: serverTick,
                        entityId: localPlayerId.toString(),
                        state: { x: aPos.x as number, y: aPos.y as number, vx: aVel.dx as number, vy: aVel.dy as number, angle: aPos.rotation as number },
                        entities: authoritativeSnapshot.entities.map(e => e.toString())
                    });
                }
            }

            if (localPlayerId !== undefined && !world.hasComponent(localPlayerId, "LocalPlayer")) {
                world.getCommandBuffer().addComponent(localPlayerId, { type: "Tag", tags: ["LocalPlayer"] } as TagComponent);
            }

            this.inputHistory
                .filter(input => input.tick > serverTick)
                .forEach(input => {
                    if (localPlayerId !== undefined) {
                        this.game.applyInputToEntity(localPlayerId, input);
                    }
                    this.game.runSimulationStep(16.66, true);

                    if (localPlayerId !== undefined) {
                        const trans = world.getComponent<TransformComponent>(localPlayerId, "Transform");
                        const vel = world.getComponent<VelocityComponent>(localPlayerId, "Velocity");
                        if (trans && vel) {
                            this.predictionBuffer.save({
                                tick: input.tick,
                                entityId: localPlayerId.toString(),
                                state: { x: trans.x, y: trans.y, vx: vel.dx, vy: vel.dy, angle: trans.rotation },
                                entities: world.entities.map(e => e.toString())
                            });
                        }
                    }
                    this.setStateHistory(input.tick, world.snapshot());
                });

            visualMismatches.forEach((prevPos, id) => {
                const newTrans = world.getComponent<TransformComponent>(id, "Transform");
                if (newTrans) {
                    const errX = prevPos.x - newTrans.x;
                    const errY = prevPos.y - newTrans.y;

                    world.getCommandBuffer().addComponent(id, {
                        type: "VisualOffset", x: errX, y: errY, rotation: 0, scaleX: 0, scaleY: 0
                    } as VisualOffsetComponent);

                    JuiceSystem.add(world, id, { property: "x", target: 0, duration: 150, easing: "easeOut" });
                    JuiceSystem.add(world, id, { property: "y", target: 0, duration: 150, easing: "easeOut" });
                }
            });
        }

        this.inputHistory = this.inputHistory.filter(i => i.tick > serverTick);
        this.predictionBuffer.clearBefore(serverTick);
    }

    public recordPrediction(input: InputFrame, world: World): void {
        this.inputHistory.push(input);

        const lp = world.query("Tag").find(e => {
            const tag = world.getComponent(e, "Tag") as TagComponent;
            return tag && tag.tags.includes("LocalPlayer");
        });
        if (lp !== undefined) {
            const trans = world.getComponent<TransformComponent>(lp, "Transform");
            const vel = world.getComponent<VelocityComponent>(lp, "Velocity");
            if (trans && vel) {
                this.predictionBuffer.save({
                    tick: input.tick,
                    entityId: lp.toString(),
                    state: { x: trans.x, y: trans.y, vx: vel.dx, vy: vel.dy, angle: trans.rotation },
                    entities: world.entities.map(e => e.toString())
                });
            }
        }

        this.setStateHistory(input.tick, world.snapshot());

        if (this.inputHistory.length > this.maxHistory) {
            this.inputHistory.shift();
        }
    }

    public getStateHistory(tick: number): WorldSnapshot | undefined {
        return this.stateHistory.get(tick);
    }

    private setStateHistory(tick: number, snapshot: WorldSnapshot) {
        this.stateHistory.set(tick, snapshot);
        if (this.stateHistory.size > this.maxHistory) {
            let oldestTick = Infinity;
            for (const t of this.stateHistory.keys()) {
                if (t < oldestTick) oldestTick = t;
            }
            if (oldestTick !== Infinity) {
                this.stateHistory.delete(oldestTick);
            }
        }
    }

    public reset(): void {
        this.predictionBuffer.clear();
        this.inputHistory = [];
        this.stateHistory.clear();
        this.entityInterpolationBuffers.clear();
        this.lastAuthoritativeTick = 0;
    }
}

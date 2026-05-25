import { World } from "../../core/World";
import { WorldSnapshot } from "../../types/EngineTypes";
import { TransformComponent, VelocityComponent, VisualOffsetComponent, TagComponent, PreviousTransformComponent } from "../../core/CoreComponents";
import { ReconciliationStrategy } from "../ReconciliationStrategy";
import { INetworkGame, NetworkConfig } from "../types/NetworkTypes";
import { PredictionBuffer } from "../../../multiplayer/PredictionBuffer";
import { InputFrame } from "../../../multiplayer/NetTypes";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { InterpolationBuffer } from "../../../multiplayer/InterpolationSystem";
import { StateHistoryManager } from "../StateHistoryManager";
import { DesyncDetector } from "../DesyncDetector";
import { InputRingBuffer } from "../../../multiplayer/InputRingBuffer";
import { RemoteInputPredictor } from "../../../multiplayer/RemoteInputPredictor";
import { InputSerializer, InputBurstPayload } from "../../../multiplayer/InputSerializer";

/**
 * Strategy for full prediction and rollback reconciliation.
 * Designed for fast-paced games with high interactivity requirements.
 *
 * Implements a Rollback Netcode pattern:
 * 1. Prediction: Apply local inputs immediately for low perceived latency.
 * 2. History: Maintains a buffer of recent inputs and world state snapshots.
 * 3. Validation: Compares predicted state against authoritative server snapshots.
 * 4. Rewind & Fast-Forward: If a desync is detected, the world is restored to the
 *    last known-good state and re-simulated up to the current tick.
 *
 * @remarks
 * This strategy demands a high degree of determinism in the underlying simulation
 * and carries a significant CPU cost during rollback frames, as multiple simulation
 * ticks may be executed in a single frame.
 */
export class FullReconciliationStrategy implements ReconciliationStrategy {
    private predictionBuffer = new PredictionBuffer();
    private entityInterpolationBuffers = new Map<string, InterpolationBuffer>();
    private inputRingBuffer = new InputRingBuffer(256);
    private stateHistory = new StateHistoryManager();
    private desyncDetector = new DesyncDetector();
    private lastAuthoritativeTick = 0;
    private interpolationDelay: number;
    private maxHistory: number;
    private currentTick = 0;

    // Reuse objects to avoid allocations in hot path
    private burstBuffer: InputBurstPayload = {
        latestTick: 0,
        frames: [],
        sessionId: ""
    };
    private snapshotPool: WorldSnapshot[] = [];
    private predictedStateBuffer = {
        tick: 0,
        entityId: "",
        state: { x: 0, y: 0, vx: 0, vy: 0, angle: 0 },
        entities: [] as string[]
    };

    constructor(private game: INetworkGame, config: NetworkConfig = {}) {
        this.interpolationDelay = config.interpolationDelay ?? 100;
        this.maxHistory = config.maxHistory ?? 120;
        this.stateHistory = new StateHistoryManager(this.maxHistory);
        this.inputRingBuffer = new InputRingBuffer(this.maxHistory * 2);

        // Pre-allocate a pool of distinct snapshots for re-simulation history
        for (let i = 0; i < this.maxHistory; i++) {
            this.snapshotPool.push({
                entities: [],
                componentData: {},
                nextEntityId: 0,
                freeEntities: [],
                structureVersion: 0,
                stateVersion: 0,
                seed: 0,
                rngState: 0,
                accumulator: 0,
                tick: 0
            });
        }
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

        // Update interpolation buffers for remote entities
        const timestamp = Date.now();
        authoritativeSnapshot.entities.forEach(entityId => {
            const transform = authoritativeSnapshot.componentData["Transform"]?.[entityId];
            if (!transform) return;

            const id = entityId.toString();
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

        // Capture previous transform before state mutation for interpolation
        world.query("Transform").forEach(entity => {
            const trans = world.getComponent<TransformComponent>(entity, "Transform");
            if (trans) {
                world.mutateComponent<PreviousTransformComponent>(entity, "PreviousTransform", prev => {
                    prev.x = trans.x;
                    prev.y = trans.y;
                    prev.rotation = trans.rotation;
                });
            }
        });

        // Always save the latest authoritative state in history
        this.stateHistory.save(serverTick, authoritativeSnapshot);

        let needsRollback = false;
        let localPlayerId: number | undefined;

        if (localSessionId) {
            localPlayerId = this.desyncDetector.findEntityBySessionId(authoritativeSnapshot, localSessionId);
        }

        if (!predicted) {
            // We have no prediction for this server tick, must rollback to align
            needsRollback = true;
        } else if (localPlayerId !== undefined) {
            // Check for desync between our prediction and the server truth
            needsRollback = this.desyncDetector.isDesynced(predicted, authoritativeSnapshot, localPlayerId);
        }

        if (needsRollback) {
            this.executeRollback(serverTick, authoritativeSnapshot, localPlayerId);
        }

        // Clean up old history
        this.predictionBuffer.clearBefore(serverTick);
        this.stateHistory.pruneBefore(serverTick);
    }

    /**
     * Re-simulation loop (Rewind + Fast-Forward).
     *
     * @remarks
     * This process is designed to correct prediction errors by restoring the world
     * to a confirmed server state and re-applying local inputs.
     *
     * @warning The cost of this operation is O(N) where N is the number of ticks
     * between the authoritative update and the current client tick.
     */
    private executeRollback(serverTick: number, authoritativeSnapshot: WorldSnapshot, localPlayerId?: number) {
        const world = this.game.getWorld();

        // 1. Rewind: Restore to authoritative state
        // Before restoring, capture current position for visual smoothing (Paso 13)
        const visualMismatches = new Map<number, { x: number, y: number }>();
        if (localPlayerId !== undefined) {
            const currentTrans = world.getComponent<TransformComponent>(localPlayerId, "Transform");
            if (currentTrans) {
                visualMismatches.set(localPlayerId, { x: currentTrans.x, y: currentTrans.y });
            }
        }

        world.restore(authoritativeSnapshot);

        // Re-tag local player if lost during restore
        if (localPlayerId !== undefined && !world.hasComponent(localPlayerId, "Tag")) {
            world.addComponent(localPlayerId, { type: "Tag", tags: ["LocalPlayer"] } as TagComponent);
        }

        // 2. Fast-Forward: Re-simulate from serverTick to current
        world.isReSimulating = true;
        try {
            for (let t = serverTick + 1; t <= this.currentTick; t++) {
                let input = this.inputRingBuffer.get(t);

                // Paso 6: Predict missing inputs
                if (!input) {
                    input = RemoteInputPredictor.predictNext(this.inputRingBuffer, t);
                    this.inputRingBuffer.set(input);
                }

                if (localPlayerId !== undefined) {
                    this.game.applyInputToEntity(localPlayerId, input);
                }

                // Paso 10: Fast-Forward simulation step
                // 60 FPS = 1000/60 = 16.666...
                this.game.runSimulationStep(16.666, true);

                // Re-calculate predictions for corrected history
                if (localPlayerId !== undefined) {
                    const trans = world.getComponent<TransformComponent>(localPlayerId, "Transform");
                    const vel = world.getComponent<VelocityComponent>(localPlayerId, "Velocity");
                    if (trans && vel) {
                        this.predictionBuffer.save({
                            tick: t,
                            entityId: localPlayerId.toString(),
                            state: {
                                x: trans.x,
                                y: trans.y,
                                vx: vel.dx,
                                vy: vel.dy,
                                angle: trans.rotation
                            },
                            entities: []
                        });
                    }
                }

                // Update history with re-simulated state using pooling
                const poolIndex = t % this.snapshotPool.length;
                this.stateHistory.save(t, world.snapshot(this.snapshotPool[poolIndex]));
            }
        } finally {
            world.isReSimulating = false;
        }

        // 3. Apply visual correction (Paso 13 logic)
        visualMismatches.forEach((prevPos, id) => {
            const newTrans = world.getComponent<TransformComponent>(id, "Transform");
            if (newTrans) {
                const errX = prevPos.x - newTrans.x;
                const errY = prevPos.y - newTrans.y;

                // Only apply if error is significant to avoid jitter
                if (Math.abs(errX) > 0.01 || Math.abs(errY) > 0.01) {
                    world.getCommandBuffer().addComponent(id, {
                        type: "VisualOffset", x: errX, y: errY, rotation: 0, scaleX: 0, scaleY: 0
                    } as VisualOffsetComponent);

                    JuiceSystem.add(world, id, { property: "x", target: 0, duration: 150, easing: "easeOut" });
                    JuiceSystem.add(world, id, { property: "y", target: 0, duration: 150, easing: "easeOut" });
                }
            }
        });

        // Ensure structural changes from re-simulation are applied
        world.flush();
    }

    public recordPrediction(input: InputFrame, world: World): void {
        this.inputRingBuffer.set(input);
        this.currentTick = input.tick;

        // Paso 11: Capture PreviousTransform for smooth alpha interpolation
        const transformEntities = world.query("Transform");
        for (let i = 0; i < transformEntities.length; i++) {
            const entity = transformEntities[i];
            const trans = world.getComponent<TransformComponent>(entity, "Transform");
            if (trans) {
                world.mutateComponent<PreviousTransformComponent>(entity, "PreviousTransform", prev => {
                    prev.x = trans.x;
                    prev.y = trans.y;
                    prev.rotation = trans.rotation;
                });
            }
        }

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
                    state: {
                        x: trans.x,
                        y: trans.y,
                        vx: vel.dx,
                        vy: vel.dy,
                        angle: trans.rotation
                    },
                    entities: []
                });
            }
        }

        // Paso 7: Save local predicted state to history using pooling
        const poolIndex = input.tick % this.snapshotPool.length;
        this.stateHistory.save(input.tick, world.snapshot(this.snapshotPool[poolIndex]));
    }

    public getStateHistory(tick: number): WorldSnapshot | undefined {
        return this.stateHistory.get(tick);
    }

    /**
     * Paso 5: Generates a redundant burst of recent inputs to mitigate packet loss.
     */
    public getPendingInputBurst(sessionId: string, redundancy: number = 5): InputBurstPayload {
        return InputSerializer.pack(
            this.inputRingBuffer,
            this.currentTick,
            redundancy,
            sessionId,
            this.burstBuffer
        );
    }

    public reset(): void {
        this.predictionBuffer.clear();
        this.inputRingBuffer.clear();
        this.stateHistory.clear();
        this.entityInterpolationBuffers.clear();
        this.lastAuthoritativeTick = 0;
        this.currentTick = 0;
    }
}

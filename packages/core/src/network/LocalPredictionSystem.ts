/* eslint-disable no-restricted-imports, @typescript-eslint/no-explicit-any */
import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { NetworkManager } from "./NetworkManager";
import { computeShipPhysics } from "../games/asteroids/utils/AsteroidPhysics";
import { MultiplayerRegistry, ReconciledInput, AuthoritativeServerState } from "./types";

/**
 * System responsible for client-side local prediction and input reconciliation.
 * Runs in SystemPhase.Input phase.
 *
 * @public
 */
export class LocalPredictionSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    private inputQueue: ReconciledInput<any>[] = [];
    private lastProcessedTick = 0;

    constructor(private networkManager: NetworkManager) {
        super();
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;
        const dtSec = deltaTime / 1000;

        const config = (world.getResource<any>("GameConfig") ?? {
            SHIP_THRUST: 150,
            SHIP_ROTATION_SPEED: Math.PI,
            SHIP_FRICTION: 0.99
        });

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input     = w.getComponent(entity, "Input");
            const velocity  = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");
            if (!input || !velocity || !transform) continue;

            // Extract to plain objects to satisfy pure function call and avoid frozen/readonly mutations
            const tPlane = { rotation: transform.rotation };
            const vPlane = { vx: velocity.vx, vy: velocity.vy };
            const iPlane = {
                thrust: input.thrust,
                rotateLeft: input.rotateLeft,
                rotateRight: input.rotateRight,
                rotationAmount: input.rotationAmount,
                shoot: input.shoot,
                hyperspace: input.hyperspace
            };

            const phys = computeShipPhysics(tPlane, vPlane, iPlane, config, dtSec);

            w.mutateComponent(entity, "Velocity", (v) => {
                v.vx = phys.vx;
                v.vy = phys.vy;
            });
            w.mutateComponent(entity, "Transform", (t) => {
                t.rotation = phys.rotation;
            });

            const finalVelocity  = w.getComponent(entity, "Velocity")!;
            const finalTransform = w.getComponent(entity, "Transform")!;

            this.inputQueue.push({
                tick: this.lastProcessedTick++,
                input: { ...input },
                state: {
                    x: finalTransform.x, y: finalTransform.y,
                    vx: finalVelocity.vx, vy: finalVelocity.vy
                },
                dt: deltaTime
            });
        }
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}

    public reconcile(
        world: World<TRegistry>,
        serverTick: number,
        serverState: AuthoritativeServerState
    ): void {
        const w = world as unknown as World<MultiplayerRegistry>;
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

        const config = (world.getResource<any>("GameConfig") ?? {
            SHIP_THRUST: 150,
            SHIP_ROTATION_SPEED: Math.PI,
            SHIP_FRICTION: 0.99
        });

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity");
        for (const entity of localQuery) {
            w.mutateComponent(entity, "Transform", (t) => {
                t.x = serverState.x;
                t.y = serverState.y;
            });
            w.mutateComponent(entity, "Velocity", (v) => {
                v.vx = serverState.vx;
                v.vy = serverState.vy;
            });

            for (const item of this.inputQueue) {
                const itemDtSec = item.dt / 1000;

                const currentTransform = w.getComponent(entity, "Transform")!;
                const currentVelocity  = w.getComponent(entity, "Velocity")!;

                // Extract to plain objects
                const tPlane = { rotation: currentTransform.rotation };
                const vPlane = { vx: currentVelocity.vx, vy: currentVelocity.vy };
                const iPlane = {
                    thrust: item.input.thrust,
                    rotateLeft: item.input.rotateLeft,
                    rotateRight: item.input.rotateRight,
                    rotationAmount: item.input.rotationAmount,
                    shoot: item.input.shoot,
                    hyperspace: item.input.hyperspace
                };

                const phys = computeShipPhysics(
                    tPlane,
                    vPlane,
                    iPlane,
                    config,
                    itemDtSec
                );

                w.mutateComponent(entity, "Velocity", (v) => {
                    v.vx = phys.vx;
                    v.vy = phys.vy;
                });
                w.mutateComponent(entity, "Transform", (t) => {
                    t.rotation = phys.rotation;
                    t.x += phys.vx * itemDtSec;
                    t.y += phys.vy * itemDtSec;
                });
            }
        }
    }
}

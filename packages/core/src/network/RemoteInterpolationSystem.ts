/* eslint-disable no-restricted-imports, @typescript-eslint/no-explicit-any */
import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { NetworkManager } from "./NetworkManager";
import { MultiplayerRegistry } from "./types";

/**
 * System responsible for visual interpolation (LERP) on Remote Players.
 * Runs in SystemPhase.Presentation phase.
 *
 * @public
 */
export class RemoteInterpolationSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    constructor(private networkManager: NetworkManager) {
        super();
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        const remoteQuery = w.query("Transform", "RemotePlayer");
        for (const entity of remoteQuery) {
            const remote = w.getComponent(entity, "RemotePlayer");
            if (remote && remote.targetX !== undefined && remote.targetY !== undefined) {
                const alpha = 0.15;
                w.mutateComponent(entity, "Transform", (t) => {
                    t.x += (remote.targetX! - t.x) * alpha;
                    t.y += (remote.targetY! - t.y) * alpha;
                    if (remote.targetRotation !== undefined) {
                        let diffRot = remote.targetRotation - t.rotation;
                        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                        t.rotation += diffRot * alpha;
                    }
                });
            }
        }
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}
}

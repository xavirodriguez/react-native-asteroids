import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { MultiplayerRegistry } from "./ReplicationSystem";

/**
 * Sistema responsable de la interpolación visual de entidades remotas.
 *
 * @remarks
 * Aplica LERP con un factor de suavizado a las coordenadas físicas de las entidades remotas,
 * para mitigar saltos visuales debido a la latencia o jitter de la red.
 *
 * @public
 */
export class RemoteInterpolationSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    public update(world: World<TRegistry>, _deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        // --- Interpolación LERP de entidades remotas ---
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
}

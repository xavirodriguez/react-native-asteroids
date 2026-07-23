import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { NetworkManager } from "./NetworkManager";
import { RemoteInterpolationSystem } from "./RemoteInterpolationSystem";
import { LocalPredictionSystem, LocalPredictionPhysicsSimulator } from "./LocalPredictionSystem";

/** @public */
export interface MultiplayerRegistry extends CoreComponentRegistry {
    RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
    LocalPlayer: { type: "LocalPlayer" };
    Input: {
        type: "Input";
        thrust?: boolean;
        rotateLeft?: boolean;
        rotateRight?: boolean;
        shoot?: boolean;
        hyperspace?: boolean;
        rotationAmount?: number;
    };
}

/** @public */
export interface ReconciledInput<TInput = {
    thrust?: boolean;
    rotateLeft?: boolean;
    rotateRight?: boolean;
    shoot?: boolean;
    hyperspace?: boolean;
    rotationAmount?: number;
}> {
    tick: number;
    input: TInput;
    state: { x: number; y: number; vx: number; vy: number };
    dt: number;
}

/** @public */
export interface AuthoritativeServerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

/**
 * Sistema responsable de la replicación de red de entidades multijugador, delegando en los subsistemas de predicción local y de interpolación remota.
 *
 * @remarks
 * Esta clase mantiene 100% de compatibilidad con versiones anteriores delegando su ejecución interna
 * a `LocalPredictionSystem` y `RemoteInterpolationSystem`.
 *
 * @public
 */
export class ReplicationSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    private localPredictionSystem: LocalPredictionSystem<TRegistry>;
    private remoteInterpolationSystem: RemoteInterpolationSystem<TRegistry>;

    constructor(
        private networkManager: NetworkManager,
        simulator?: LocalPredictionPhysicsSimulator<TRegistry["Input"]>
    ) {
        super();
        const finalSimulator = simulator ?? (((transform, velocity) => {
            return { rotation: transform.rotation, vx: velocity.vx, vy: velocity.vy };
        }) as LocalPredictionPhysicsSimulator<TRegistry["Input"]>);

        this.localPredictionSystem = new LocalPredictionSystem<TRegistry>(finalSimulator);
        this.remoteInterpolationSystem = new RemoteInterpolationSystem<TRegistry>();
    }

    /**
     * Devuelve la instancia interna de LocalPredictionSystem (útil para tests).
     */
    public getLocalPredictionSystem(): LocalPredictionSystem<TRegistry> {
        return this.localPredictionSystem;
    }

    /**
     * Devuelve la instancia interna de RemoteInterpolationSystem (útil para tests).
     */
    public getRemoteInterpolationSystem(): RemoteInterpolationSystem<TRegistry> {
        return this.remoteInterpolationSystem;
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        this.remoteInterpolationSystem.update(world, deltaTime);
        this.localPredictionSystem.update(world, deltaTime);
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}

    /**
     * Reconcilia el estado lógico del jugador local con el estado autoritativo del servidor delegando en LocalPredictionSystem.
     */
    public reconcile(
        world: World<TRegistry>,
        serverTick: number,
        serverState: AuthoritativeServerState
    ): void {
        this.localPredictionSystem.reconcile(world, serverTick, serverState);
    }
}

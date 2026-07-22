import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { NetworkManager } from "./NetworkManager";

/** @public */
export interface MultiplayerRegistry extends CoreComponentRegistry {
    RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
    LocalPlayer: { type: "LocalPlayer" };
    Input: { type: "Input"; thrust?: boolean };
}

/** @public */
export interface ReconciledInput<TInput = { thrust?: boolean }> {
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
 * Sistema responsable de la replicación de red de entidades multijugador, predicción del lado cliente y reconciliación de inputs.
 *
 * @remarks
 * Diseñado para soportar interpolación de coordenadas para entidades remotas (LERP) y predicción local
 * con descarte de inputs confirmados por el servidor para el jugador local, mitigando la percepción de latencia de red.
 *
 * @responsibility Replicar el estado de red localmente de forma determinista y reconciliar la física en base a los ticks confirmados del servidor.
 * @queries ["Transform", "RemotePlayer"], ["Transform", "LocalPlayer", "Velocity", "Input"] — Lee y filtra entidades de red locales y remotas.
 * @mutates ["Transform"], ["Velocity"] — Actualiza coordenadas físicas tras aplicar predicción, LERP o reconciliación de red.
 * @emits Ninguno.
 * @dependsOn Ninguno directamente; suele ejecutarse al inicio de las fases de actualización física.
 * @executionOrder Al inicio del frame para reconciliar la física con los snapshots autoritativos antes del paso de simulación local.
 *
 * @public
 */
export class ReplicationSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    private inputQueue: ReconciledInput[] = [];
    private lastProcessedTick = 0;

    constructor(private networkManager: NetworkManager) { super(); }

    /**
     * Actualiza el estado visual de las entidades remotas interpolando sus posiciones, y registra la predicción local.
     *
     * @remarks
     * Se encarga de aplicar LERP con un factor de suavizado a las entidades remotas, y realiza
     * client-side prediction acumulando inputs en `inputQueue` para el jugador local.
     *
     * @precondition El World debe contener entidades de red registradas correspondientemente con sus componentes.
     * @postcondition Las posiciones visuales de entidades remotas se aproximan a sus objetivos, y el input local del frame actual se encola para futura reconciliación.
     * @invariant El buffer de inputs local guarda la secuencia exacta de comandos ejecutados en orden secuencial.
     * @throws Ninguno.
     * @sideEffect Modifica componentes `Transform` y `Velocity` en el World de forma directa, incrementando `_stateVersion`.
     * @conceptualRisk [DETERMINISM] La interpolación visual remota ocurre en caliente en el update físico local, lo que desacopla la simulación determinista pura de los efectos puramente visuales de red.
     */
    public update(world: World<TRegistry>, deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        const remoteQuery = w.query("Transform", "RemotePlayer");
        for (const entity of remoteQuery) {
            const remote = w.getComponent(entity, "RemotePlayer");

            if (remote && remote.targetX !== undefined && remote.targetY !== undefined) {
                // Implement Linear Interpolation (Lerp) for remote entities
                // P_visual = P_old + (P_new - P_old) * alpha
                const alpha = 0.15; // Interpolation factor
                w.mutateComponent(entity, "Transform", (t) => {
                    t.x += (remote.targetX! - t.x) * alpha;
                    t.y += (remote.targetY! - t.y) * alpha;

                    // Angle interpolation (handling wrap-around)
                    if (remote.targetRotation !== undefined) {
                        let diffRot = remote.targetRotation - t.rotation;
                        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                        t.rotation += diffRot * alpha;
                    }
                });
            }
        }

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input = w.getComponent(entity, "Input");
            const velocity = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");

            if (input && velocity && transform) {
                // Client-Side Prediction: apply input locally before server confirmation
                if (input.thrust) {
                    const power = 150;
                    const ax = Math.cos(transform.rotation) * power;
                    const ay = Math.sin(transform.rotation) * power;
                    w.mutateComponent(entity, "Velocity", (v) => {
                        v.vx += ax * (deltaTime / 1000);
                        v.vy += ay * (deltaTime / 1000);
                    });
                }

                const finalVelocity = w.getComponent(entity, "Velocity")!;
                // Save input in a queue for future reconciliation
                this.inputQueue.push({
                    tick: this.lastProcessedTick++,
                    input: { ...input },
                    state: { x: transform.x, y: transform.y, vx: finalVelocity.vx, vy: finalVelocity.vy },
                    dt: deltaTime
                });
            }
        }
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}

    /**
     * Reconcilia el estado lógico del jugador con el estado autoritativo recibido del servidor.
     *
     * @remarks
     * Descarta inputs ya procesados por el servidor, restablece la física local al último tick del servidor,
     * y vuelve a aplicar (replays) todos los inputs pendientes que aún no han sido confirmados para ponerse al día.
     *
     * @precondition El servidor debe haber enviado un tick y estado válidos (`serverState`).
     * @postcondition El estado local del jugador local coincide exactamente con la simulación del servidor extrapolada con los comandos locales pendientes.
     * @invariant Los inputs confirmados son removidos por completo de la cola `inputQueue`.
     * @throws Ninguno.
     * @sideEffect Restablece y muta `Transform` y `Velocity` del jugador local.
     * @conceptualRisk [GC_PRESSURE] El rollback continuo y la re-simulación de múltiples ticks acumulados genera allocations frecuentes al mutar componentes, pudiendo causar stutters bajo alta latencia o pérdida de paquetes de red.
     *
     * @param world - El World de la simulación.
     * @param serverTick - El último número de tick procesado y confirmado por el servidor.
     * @param serverState - El estado autoritativo (posición y velocidad) del jugador remoto en dicho tick del servidor.
     */
    public reconcile(world: World<TRegistry>, serverTick: number, serverState: AuthoritativeServerState): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        // 1. Discard inputs that have already been processed by the server
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

        // 2. Find the local player entity
        const localQuery = w.query("Transform", "LocalPlayer", "Velocity");
        for (const entity of localQuery) {
            const transform = w.getComponent(entity, "Transform");
            const velocity = w.getComponent(entity, "Velocity");

            // 3. Reset local state to the last authoritative state from server
            if (transform && velocity && serverState) {
                w.mutateComponent(entity, "Transform", (t) => {
                    t.x = serverState.x;
                    t.y = serverState.y;
                });
                w.mutateComponent(entity, "Velocity", (v) => {
                    v.vx = serverState.vx;
                    v.vy = serverState.vy;
                });
            }

            if (transform && velocity) {
                // 4. Replay all pending inputs to catch up to the current client tick
                for (const item of this.inputQueue) {
                    const input = item.input;
                    const dt = item.dt; // Real delta time from the input frame

                    if (input.thrust) {
                        const power = 150;
                        w.mutateComponent(entity, "Velocity", (v) => {
                            const ax = Math.cos(transform.rotation) * power;
                            const ay = Math.sin(transform.rotation) * power;
                            v.vx += ax * (dt / 1000);
                            v.vy += ay * (dt / 1000);
                        });
                    }

                    // Update position based on replayed velocity
                    const currentVelocity = w.getComponent(entity, "Velocity");
                    if (currentVelocity) {
                        w.mutateComponent(entity, "Transform", (t) => {
                            t.x += currentVelocity.vx * (dt / 1000);
                            t.y += currentVelocity.vy * (dt / 1000);
                        });
                    }
                }
            }
        }
    }
}

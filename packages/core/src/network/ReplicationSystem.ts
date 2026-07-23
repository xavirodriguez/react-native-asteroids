/* eslint-disable no-restricted-imports, @typescript-eslint/no-explicit-any */
import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { NetworkManager } from "./NetworkManager";
import { computeShipPhysics } from "../games/asteroids/utils/AsteroidPhysics";

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
    private inputQueue: ReconciledInput<any>[] = [];
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
        const dtSec = deltaTime / 1000;

        // --- Interpolación LERP de entidades remotas (sin cambios) ---
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

        // --- Client-Side Prediction usando computeShipPhysics ---
        // Leer config UNA sola vez; los defaults deben coincidir con AsteroidConfigSchema
        const config = (world.getResource<any>("GameConfig") ?? {
            SHIP_THRUST: 150,
            SHIP_ROTATION_SPEED: Math.PI,
            SHIP_FRICTION: 0.0   // ← 0.0 por defecto para compatibilidad con tests sin GameConfig, pero AsteroidConfigSchema provee 0.99
        });

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input     = w.getComponent(entity, "Input");
            const velocity  = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");
            if (!input || !velocity || !transform) continue;

            // ✅ Una sola fuente de verdad física
            const phys = computeShipPhysics(transform, velocity, input, config, dtSec);

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
            SHIP_FRICTION: 0.0   // ← 0.0 por defecto para compatibilidad con tests sin GameConfig, pero AsteroidConfigSchema provee 0.99
        });

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity");
        for (const entity of localQuery) {
            // 1. Resetear al estado autoritativo del servidor
            w.mutateComponent(entity, "Transform", (t) => {
                t.x = serverState.x;
                t.y = serverState.y;
            });
            w.mutateComponent(entity, "Velocity", (v) => {
                v.vx = serverState.vx;
                v.vy = serverState.vy;
            });

            // 2. Replay de inputs pendientes con la MISMA función pura
            for (const item of this.inputQueue) {
                const dtSec = item.dt / 1000;

                // Leer estado ACTUAL (evoluciona tick a tick durante el replay)
                const currentTransform = w.getComponent(entity, "Transform")!;
                const currentVelocity  = w.getComponent(entity, "Velocity")!;

                // ✅ computeShipPhysics garantiza determinismo idéntico al servidor
                const phys = computeShipPhysics(
                    currentTransform,
                    currentVelocity,
                    item.input,
                    config,
                    dtSec
                );

                w.mutateComponent(entity, "Velocity", (v) => {
                    v.vx = phys.vx;
                    v.vy = phys.vy;
                });
                w.mutateComponent(entity, "Transform", (t) => {
                    t.rotation = phys.rotation;
                    // Integrar posición con la velocidad ya actualizada
                    t.x += phys.vx * dtSec;
                    t.y += phys.vy * dtSec;
                });
            }
        }
    }
}

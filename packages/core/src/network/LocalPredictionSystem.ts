import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { MultiplayerRegistry, ReconciledInput, AuthoritativeServerState } from "./ReplicationSystem";

/**
 * Type representing a game-agnostic physics simulator function for local prediction.
 *
 * @public
 */
export type LocalPredictionPhysicsSimulator<TInput = Record<string, unknown>> = (
    transform: { rotation: number },
    velocity: { vx: number; vy: number },
    input: TInput,
    config: { SHIP_THRUST: number; SHIP_ROTATION_SPEED: number; SHIP_FRICTION: number },
    dtSec: number
) => { rotation: number; vx: number; vy: number };

/**
 * Sistema responsable de la predicción en el lado del cliente y la reconciliación de inputs del jugador local.
 *
 * @remarks
 * Mantiene un buffer de entradas locales no confirmadas por el servidor (`inputQueue`) y realiza
 * replay/reconciliación cuando el servidor confirma un nuevo tick autoritativo de posición/velocidad.
 *
 * @public
 */
export class LocalPredictionSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    private inputQueue: ReconciledInput<TRegistry["Input"]>[] = [];
    private lastProcessedTick = 0;

    constructor(private simulator: LocalPredictionPhysicsSimulator<TRegistry["Input"]>) {
        super();
    }

    /**
     * Devuelve el queue de inputs para facilitar la cobertura de tests de reconciliación/predicción.
     */
    public getInputQueue(): ReconciledInput<TRegistry["Input"]>[] {
        return this.inputQueue;
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;
        const dtSec = deltaTime / 1000;

        // --- Client-Side Prediction usando el simulador de física provisto ---
        const config = world.getResource<{
            SHIP_THRUST: number;
            SHIP_ROTATION_SPEED: number;
            SHIP_FRICTION: number;
        }>("GameConfig") ?? {
            SHIP_THRUST: 150,
            SHIP_ROTATION_SPEED: Math.PI,
            SHIP_FRICTION: 0.0   // ← 0.0 por defecto para compatibilidad con tests sin GameConfig
        };

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input     = w.getComponent(entity, "Input");
            const velocity  = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");
            if (!input || !velocity || !transform) continue;

            // ✅ Una sola fuente de verdad física delegando al simulador agnóstico
            const phys = this.simulator(transform, velocity, input, config, dtSec);

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

    /**
     * Reconcilia el estado lógico del jugador con el estado autoritativo recibido del servidor.
     *
     * @remarks
     * Descarta inputs ya procesados por el servidor, restablece la física local al último tick del servidor,
     * y vuelve a aplicar (replays) todos los inputs pendientes que aún no han sido confirmados para ponerse al día.
     */
    public reconcile(
        world: World<TRegistry>,
        serverTick: number,
        serverState: AuthoritativeServerState
    ): void {
        const w = world as unknown as World<MultiplayerRegistry>;
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

        const config = world.getResource<{
            SHIP_THRUST: number;
            SHIP_ROTATION_SPEED: number;
            SHIP_FRICTION: number;
        }>("GameConfig") ?? {
            SHIP_THRUST: 150,
            SHIP_ROTATION_SPEED: Math.PI,
            SHIP_FRICTION: 0.0   // ← 0.0 por defecto para compatibilidad con tests sin GameConfig
        };

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

            // 2. Replay de inputs pendientes con la MISMA función pura delegada
            for (const item of this.inputQueue) {
                const dtSec = item.dt / 1000;

                // Leer estado ACTUAL (evoluciona tick a tick durante el replay)
                const currentTransform = w.getComponent(entity, "Transform")!;
                const currentVelocity  = w.getComponent(entity, "Velocity")!;

                // ✅ El simulador garantiza determinismo idéntico al servidor
                const phys = this.simulator(
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

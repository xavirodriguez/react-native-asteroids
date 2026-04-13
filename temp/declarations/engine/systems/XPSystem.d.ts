import { System } from "../core/System";
import { World } from "../core/World";
import { EventBus } from "../core/EventBus";
/**
 * Componente para acumular puntos de experiencia (XP) durante una sesión de juego.
 * Actúa como un búfer temporal antes de persistir los datos al finalizar la partida.
 *
 * @responsibility Almacenar el XP pendiente de procesar en el perfil del jugador.
 */
export interface XPAccumulatorComponent {
    type: "XPAccumulator";
    /** XP acumulado en la sesión actual que aún no ha sido enviado al servicio de perfil. */
    pendingXP: number;
}
/**
 * Sistema de motor encargado de escuchar eventos de juego y traducirlos en ganancia de XP.
 * Gestiona la persistencia asíncrona al finalizar el estado de juego.
 *
 * @responsibility Escuchar hitos de gameplay y acumular XP en el perfil del jugador.
 * @queries Ninguna.
 * @mutates `XPAccumulatorComponent` (Resource).
 * @emits `level:up` cuando el servicio de perfil confirma un incremento de nivel.
 * @dependsOn `EventBus`, `PlayerProfileService`, `XP_TABLE`.
 * @executionOrder Logic Phase (independiente, pero suele ejecutarse al final de la lógica).
 * @conceptualRisk [ASYNC_RACE] El sistema dispara una llamada asíncrona a `PlayerProfileService` en el evento `game:over`.
 * Si el motor se destruye o se reinicia antes de que la promesa resuelva, el evento `level:up` podría emitirse en un contexto inválido.
 * @conceptualRisk [SINGLETON_DRIFT] Registra el acumulador como recurso en cada `update`, lo cual es redundante tras la primera ejecución.
 */
export declare class XPSystem extends System {
    private eventBus;
    private accumulator;
    /**
     * Inicializa el sistema de XP y configura los escuchas de eventos.
     *
     * @param eventBus - Bus de eventos global del motor para recibir señales de gameplay.
     */
    constructor(eventBus: EventBus);
    /**
     * Configura las suscripciones a eventos de diversos juegos para otorgar XP.
     *
     * @remarks
     * Los valores de XP se obtienen de `XP_TABLE`.
     * El evento `game:over` dispara la persistencia asíncrona.
     *
     * @sideEffect Modifica `this.accumulator.pendingXP` en respuesta a eventos.
     * @sideEffect Llama a `PlayerProfileService.addXP` (asíncrono) al recibir `game:over`.
     */
    private setupListeners;
    /**
     * Actualiza el sistema y asegura que el acumulador esté disponible en el mundo.
     *
     * @param world - Referencia al mundo ECS.
     * @param deltaTime - Tiempo transcurrido desde el último frame (en ms).
     *
     * @precondition El objeto `world` debe estar inicializado.
     * @postcondition El recurso "XPAccumulator" estará presente en el mundo.
     *
     * @conceptualRisk [REDUNDANCY] Verificar la existencia del recurso en cada frame tiene un coste O(1) despreciable pero innecesario.
     */
    update(world: World, deltaTime: number): void;
}

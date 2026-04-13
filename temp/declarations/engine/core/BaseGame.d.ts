import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventBus } from "./EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { SceneManager } from "../scenes/SceneManager";
import type { IGame, UpdateListener } from "./IGame";
export interface BaseGameConfig {
    pauseKey?: string;
    restartKey?: string;
    isMultiplayer?: boolean;
    gameOptions?: any;
}
/**
 * Main orchestrator for game lifecycle and state.
 */
export declare abstract class BaseGame<TState, TInput extends Record<string, any>> implements IGame<BaseGame<TState, TInput>> {
    protected world: World;
    protected gameLoop: GameLoop;
    protected unifiedInput: UnifiedInputSystem;
    protected eventBus: EventBus;
    protected sceneManager: SceneManager;
    protected inputBuffer: InputBuffer;
    protected networkTransport?: NetworkTransport;
    protected replayRecorder: ReplayRecorder;
    protected currentTick: number;
    protected currentSeed: number;
    isMultiplayer: boolean;
    private _isPaused;
    private _listeners;
    private _globalKeyHandler;
    protected _config: BaseGameConfig;
    protected currentSeed: number;
    constructor(config?: BaseGameConfig);
    private setupLoop;
    protected abstract registerSystems(): void;
    protected abstract initializeEntities(): void;
    abstract getGameState(): TState;
    abstract isGameOver(): boolean;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    restart(): Promise<void>;
    destroy(): void;
    getWorld(): World;
    init(): Promise<void>;
    protected registerEngineSystems(): Promise<void>;
    /**
     * Inyecta estados de entrada de forma programática utilizando el sistema de overrides.
     *
     * @remarks
     * Utilizado principalmente para controles táctiles de React Native o telemetría de red.
     *
     * @param input - Un objeto parcial con las acciones y su estado booleano.
     * @sideEffect Llama a `unifiedInput.setOverride` para cada acción proporcionada.
     */
    protected shouldStallSimulation(): boolean;
    setInput(input: Record<string, boolean>): void;
    /**
     * Registra un listener para recibir notificaciones tras cada ciclo de actualización.
     *
     * @param listener - Función callback que recibe la instancia del juego.
     * @returns Función para cancelar la suscripción.
     */
    subscribe(listener: UpdateListener<BaseGame<TState, TInput>>): () => void;
    protected _onBeforeRestart(): void | Promise<void>;
    private _notifyListeners;
    private _registerKeyboardListeners;
    private _unregisterKeyboardListeners;
    private _handleGlobalKey;
}

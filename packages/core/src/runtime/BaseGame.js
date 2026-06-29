"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseGame = void 0;
const World_1 = require("../ecs/World");
const EventBus_1 = require("../events/EventBus");
const BlueprintRegistry_1 = require("../ecs/BlueprintRegistry");
const GameLoop_1 = require("../loop/GameLoop");
const UnifiedInputSystem_1 = require("../input/UnifiedInputSystem");
/**
 * Base class for game implementations using the TinyAster engine.
 *
 * @typeParam TState - The representation of the game state.
 * @typeParam TInput - The representation of the input state.
 * @typeParam TComponents - The registry of components available in this game.
 * @typeParam TEvents - The registry of events that can be emitted.
 * @typeParam TBlueprints - The registry of blueprints that can be spawned.
 */
class BaseGame {
    world;
    eventBus;
    blueprints;
    loop;
    unifiedInput;
    _config;
    isPaused = false;
    constructor(config = {}) {
        this._config = config;
        this.world = new World_1.World();
        this.eventBus = new EventBus_1.EventBus();
        this.blueprints = new BlueprintRegistry_1.BlueprintRegistry();
        this.loop = new GameLoop_1.GameLoop();
        this.unifiedInput = new UnifiedInputSystem_1.UnifiedInputSystem();
        this.registerInternalResources();
        // Subscribe loop to update
        this.loop.subscribeUpdate((dt) => {
            if (!this.isPaused) {
                this.update(dt);
            }
        });
    }
    registerInternalResources() {
        // Register the blueprint registry as a world resource for the command buffer
        this.world.setResource("BlueprintRegistry", this.blueprints);
        this.world.setResource("EventBus", this.eventBus);
    }
    /**
     * Returns the world instance.
     */
    getWorld() {
        return this.world;
    }
    /**
     * Returns the event bus instance.
     */
    getEventBus() {
        return this.eventBus;
    }
    /**
     * Returns the input system instance.
     */
    getInputSystem() {
        return this.unifiedInput;
    }
    /**
     * Returns the game loop instance.
     */
    getGameLoop() {
        return this.loop;
    }
    /**
     * Called during game initialization.
     * Invokes internal initialize().
     */
    async init() {
        await this.initialize();
    }
    /**
     * Starts the game loop.
     */
    start() {
        this.loop.start();
    }
    /**
     * Pauses the game.
     */
    pause() {
        this.isPaused = true;
    }
    /**
     * Resumes the game.
     */
    resume() {
        this.isPaused = false;
    }
    /**
     * Returns whether the game is currently paused.
     */
    isPausedState() {
        return this.isPaused;
    }
    /**
     * Stops the loop and cleans up resources.
     */
    destroy() {
        this.loop.stop();
    }
    /**
     * Restarts the game.
     */
    async restart(seed) {
        if (seed !== undefined) {
            this._config.gameOptions = { ...this._config.gameOptions, seed };
        }
        this.destroy();
        // Reset world and re-register resources
        this.world = new World_1.World();
        this.registerInternalResources();
        // Re-register systems and initialize entities
        this.registerSystems();
        this.initializeEntities();
        this.start();
    }
    /**
     * Subscribes to state updates.
     * Note: For now, we use the loop's render subscription to notify the state.
     */
    subscribe(cb) {
        return this.loop.subscribeRender(() => {
            cb(this.getGameState());
        });
    }
    /**
     * Returns the seed used for the game session.
     */
    getSeed() {
        return this._config.gameOptions?.seed ?? 0;
    }
    /**
     * Helper to handle deferred or immediate entity creation and component attachment.
     */
    createBaseEntity(deferred) {
        const isUpdating = this.world.isUpdating;
        const isDeferred = !!(deferred || isUpdating);
        const commands = this.world.getCommandBuffer();
        if (isDeferred) {
            const entity = this.world.reserveEntityId();
            commands.createEntity(entity);
            return {
                entity,
                add: (comp) => {
                    commands.addComponent(entity, comp);
                }
            };
        }
        const entity = this.world.createEntity();
        return {
            entity,
            add: (comp) => this.world.addComponent(entity, comp)
        };
    }
}
exports.BaseGame = BaseGame;

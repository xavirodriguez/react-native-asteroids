"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullAsteroidsGame = exports.AsteroidsGame = void 0;
const core_1 = require("@tiny-aster/core");
const AsteroidGameStateSystem_1 = require("./systems/AsteroidGameStateSystem");
const AsteroidInputSystem_1 = require("./systems/AsteroidInputSystem");
const LootSystem_1 = require("../arcade/systems/LootSystem");
const PowerUpSystem_1 = require("../arcade/systems/PowerUpSystem");
const core_2 = require("@tiny-aster/core");
const core_3 = require("@tiny-aster/core");
const core_4 = require("@tiny-aster/core");
const core_5 = require("@tiny-aster/core");
const core_6 = require("@tiny-aster/core");
const core_7 = require("@tiny-aster/core");
const core_8 = require("@tiny-aster/core");
const core_9 = require("@tiny-aster/core");
const core_10 = require("@tiny-aster/core");
const AsteroidCollisionSystem_1 = require("./systems/AsteroidCollisionSystem");
const core_11 = require("@tiny-aster/core");
const core_12 = require("@tiny-aster/core");
const core_13 = require("@tiny-aster/core");
const core_14 = require("@tiny-aster/core");
const AsteroidTypes_1 = require("./types/AsteroidTypes");
const MutatorService_1 = require("../../services/MutatorService");
const EntityPool_1 = require("./EntityPool");
const AsteroidsRendererManager_1 = require("./rendering/AsteroidsRendererManager");
const core_15 = require("@tiny-aster/core");
const core_16 = require("@tiny-aster/core");
const core_17 = require("@tiny-aster/core");
const AsteroidConfigSchema_1 = require("./types/AsteroidConfigSchema");
const core_18 = require("@tiny-aster/core");
const __DEV__ = process.env.NODE_ENV !== "production";
/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 */
class AsteroidsGame extends core_1.BaseGame {
    gameStateSystem;
    assetLoader;
    bulletPool;
    particlePool;
    networkManager;
    lastProcessedFullStateVersion = -1;
    gameId = "asteroids";
    config;
    resizeListener;
    isHeadless;
    isMultiplayer;
    constructor(config = {}) {
        super();
        this.isHeadless = config.headless || false;
        this.isMultiplayer = config.isMultiplayer || false;
        const rawConfig = require("./config/asteroids.json");
        this.config = rawConfig;
    }
    async initialize() {
        const rawConfig = require("./config/asteroids.json");
        const baseConfig = core_17.ConfigService.load(this.gameId, AsteroidConfigSchema_1.AsteroidConfigSchema, rawConfig);
        const mutators = MutatorService_1.MutatorService.getActiveMutatorsForGame(this.gameId);
        const enabled = await MutatorService_1.MutatorService.isMutatorModeEnabled();
        this.config = enabled
            ? mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig })
            : { ...baseConfig };
        this.world.setResource("GameConfig", this.config);
        this.updateScreenConfig();
        if (typeof window !== "undefined") {
            this.resizeListener = () => this.updateScreenConfig();
            window.addEventListener("resize", this.resizeListener);
        }
        if (!this.isHeadless) {
            await this.onPreloadAssets();
        }
        this.registerSystems();
        this.initializeEntities();
    }
    update(dt) {
        this.world.update(dt);
    }
    updateScreenConfig() {
        let width = this.config?.SCREEN_WIDTH ?? 800;
        let height = this.config?.SCREEN_HEIGHT ?? 600;
        if (typeof window !== "undefined") {
            width = window.innerWidth;
            height = window.innerHeight;
        }
        const screenConfig = { width, height };
        this.world.setResource("ScreenConfig", screenConfig);
        if (__DEV__) {
            console.log(`[AsteroidsGame] ScreenConfig updated: ${width}x${height}`);
        }
    }
    /**
     * Preloads game assets (SFX and Textures) to prevent cold-start latency.
     *
     * @warning
     * Asset loading may fail due to network or filesystem issues. Failure to
     * preload assets may result in visual or audio artifacts during gameplay.
     */
    async onPreloadAssets() {
        const loader = this.assetLoader;
        try {
            if (loader) {
                await loader.load([
                    { id: "ship_sprite", type: "image", path: "../../../assets/ship.png" }
                ]);
            }
        }
        catch (e) {
            console.warn("[Asteroids] Asset preloading failed. Visuals or Audio may lag.", e);
        }
    }
    setMultiplayerMode(active) {
        this.isMultiplayer = active;
    }
    /**
     * Applies an input frame to a specific player ship entity.
     */
    applyInputToEntity(entityId, input) {
        this.world.mutateComponent(entityId, "Input", (inputComp) => {
            inputComp.rotateLeft = input.actions.includes("rotateLeft");
            inputComp.rotateRight = input.actions.includes("rotateRight");
            inputComp.thrust = input.actions.includes("thrust");
            inputComp.shoot = input.actions.includes("shoot");
            inputComp.hyperspace = input.actions.includes("hyperspace");
            inputComp.rotationAmount = input.axes?.horizontal ?? 0;
        });
    }
    /**
     * Performs local player movement prediction using the shared simulation.
     */
    predictLocalPlayer(input, deltaTime) {
        const localPlayer = this.world.query("LocalPlayer")[0];
        if (localPlayer !== undefined) {
            this.applyInputToEntity(localPlayer, input);
        }
        // Actual simulation step
        this.runSimulationStep(deltaTime, false);
        if (this.isMultiplayer && this.networkManager) {
            const strategy = this.networkManager.getStrategy();
            if (strategy.recordPrediction) {
                strategy.recordPrediction(input, this.world);
            }
        }
    }
    /**
     * Runs a single simulation step.
     */
    runSimulationStep(deltaTime, _isResimulating) {
        this.world.update(deltaTime);
    }
    updateFromServer(serverState, localSessionId) {
        if (!this.isMultiplayer || !serverState || !this.networkManager)
            return;
        if (serverState.delta) {
            this.handleDeltaServerUpdate(serverState, localSessionId);
        }
        else if (serverState.fullWorldState) {
            this.handleFullServerUpdate(serverState, localSessionId);
        }
    }
    handleDeltaServerUpdate(serverState, localSessionId) {
        const serverTick = serverState.tick;
        const delta = serverState.delta;
        if (!this.networkManager)
            return;
        this.networkManager.processServerUpdate(serverTick, delta, localSessionId);
        const eventBus = this.world.getEventBus();
        if (eventBus && delta.stateVersion !== undefined) {
            eventBus.emit("net:ack_version", { version: delta.stateVersion, tick: serverTick });
        }
    }
    handleFullServerUpdate(serverState, localSessionId) {
        if (!this.networkManager)
            return;
        const authoritativeSnapshot = serverState.fullWorldState;
        if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion)
            return;
        this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;
        const serverTick = serverState.serverTick;
        this.networkManager.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
    }
    registerSystems() {
        if (!this.bulletPool)
            this.bulletPool = new EntityPool_1.BulletPool();
        if (!this.particlePool)
            this.particlePool = new EntityPool_1.ParticlePool();
        if (!this.assetLoader)
            this.assetLoader = new core_1.AssetLoader();
        if (this.isMultiplayer && !this.networkManager) {
            this.networkManager = core_15.NetworkManager.registerGame(this.gameId, this, {
                strategy: 'full',
                interpolationDelay: 100
            });
        }
        this.world.setResource("BulletPool", this.bulletPool);
        this.world.setResource("AssetLoader", this.assetLoader);
        this.gameStateSystem = new AsteroidGameStateSystem_1.AsteroidGameStateSystem(this);
        this.world.addSystem(new core_10.JoystickSystem(), { phase: core_18.SystemPhase.Input });
        this.world.addSystem(new AsteroidInputSystem_1.AsteroidInputSystem(this.bulletPool, this.particlePool, this.config), { phase: core_18.SystemPhase.Simulation });
        this.world.addSystem(new core_6.MovementSystem(), { phase: core_18.SystemPhase.Simulation });
        this.world.addSystem(new core_7.BoundarySystem(), { phase: core_18.SystemPhase.Simulation });
        this.world.addSystem(new core_8.FrictionSystem(), { phase: core_18.SystemPhase.Simulation });
        this.world.addSystem(new core_13.CCDSystem(), { phase: core_18.SystemPhase.Simulation, priority: -10 });
        this.world.addSystem(new core_12.CollisionSystem2D(), { phase: core_18.SystemPhase.Collision });
        this.world.addSystem(new AsteroidCollisionSystem_1.AsteroidCollisionSystem(this.particlePool), { phase: core_18.SystemPhase.GameRules });
        this.world.addSystem(new core_11.TTLSystem(), { phase: core_18.SystemPhase.Simulation });
        this.world.addSystem(this.gameStateSystem, { phase: core_18.SystemPhase.GameRules });
        this.world.addSystem(new core_4.SpatialPartitioningSystem(), { phase: core_18.SystemPhase.Simulation });
        this.world.addSystem(new LootSystem_1.LootSystem(), { phase: core_18.SystemPhase.GameRules });
        this.world.addSystem(new PowerUpSystem_1.PowerUpSystem(), { phase: core_18.SystemPhase.Simulation });
        const activeMutators = MutatorService_1.MutatorService.getActiveMutatorsForGame(this.gameId);
        this.world.addSystem(new core_3.MutatorSystem(activeMutators), { phase: core_18.SystemPhase.Simulation });
        if (!this.isHeadless) {
            this.world.addSystem(new core_9.ScreenShakeSystem(), { phase: core_18.SystemPhase.Presentation });
            this.world.addSystem(new core_14.FeedbackSystem(), { phase: core_18.SystemPhase.Presentation });
            this.world.addSystem(new core_2.JuiceSystem(), { phase: core_18.SystemPhase.Presentation });
            this.world.addSystem(new core_5.RenderUpdateSystem(), { phase: core_18.SystemPhase.Presentation });
        }
        if (this.isMultiplayer && this.networkManager) {
            this.world.addSystem(new core_16.ReplicationSystem(this.networkManager), { phase: core_18.SystemPhase.Presentation });
        }
    }
    initializeEntities() {
        if (this.isMultiplayer)
            return;
    }
    /**
     * Registers game-specific rendering logic to the provided renderer.
     */
    initializeRenderer(renderer) {
        if (this.isHeadless)
            return;
        (0, AsteroidsRendererManager_1.initializeAsteroidsRenderer)(renderer);
    }
    getGameState() {
        const state = this.world.getSingleton("GameState");
        return state ? { ...state } : AsteroidTypes_1.INITIAL_GAME_STATE;
    }
    isGameOver() {
        return this.gameStateSystem.isGameOver();
    }
    start() {
        if (__DEV__)
            console.log("[AsteroidsGame] Simulation started");
    }
    stop() {
        if (__DEV__)
            console.log("[AsteroidsGame] Simulation stopped");
    }
    destroy() {
        if (typeof window !== "undefined" && this.resizeListener) {
            window.removeEventListener("resize", this.resizeListener);
        }
        this.bulletPool?.clear();
        this.particlePool?.clear();
    }
    pause() {
        this.world.setResource("IsPaused", true);
        if (__DEV__)
            console.log("[AsteroidsGame] Simulation paused");
    }
    resume() {
        this.world.setResource("IsPaused", false);
        if (__DEV__)
            console.log("[AsteroidsGame] Simulation resumed");
    }
}
exports.AsteroidsGame = AsteroidsGame;
class NullAsteroidsGame {
    _world = new core_1.World();
    _loop = new core_1.GameLoop();
    getWorld() { return this._world; }
    getGameLoop() { return this._loop; }
    isPausedState() { return false; }
    isGameOver() { return false; }
    getGameState() { return AsteroidTypes_1.INITIAL_GAME_STATE; }
    getSeed() { return 0; }
    subscribe(_listener) { return () => { }; }
    initializeRenderer() { }
}
exports.NullAsteroidsGame = NullAsteroidsGame;

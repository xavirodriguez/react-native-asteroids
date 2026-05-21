/* eslint-disable @typescript-eslint/no-require-imports */
import { BaseGame } from "../../engine/core/BaseGame";
import { MovementSystem } from "../../engine/physics/systems/MovementSystem";
import { BoundarySystem } from "../../engine/physics/systems/BoundarySystem";
import { JuiceSystem } from "../../engine/systems/JuiceSystem";
import { ScreenShakeSystem } from "../../engine/systems/ScreenShakeSystem";
import { RenderUpdateSystem } from "../../engine/systems/RenderUpdateSystem";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { PongCollisionSystem } from "./systems/PongCollisionSystem";
import { PongGameStateSystem } from "./systems/PongGameStateSystem";
import { PongInputSystem } from "./systems/PongInputSystem";
import { CollisionSystem2D } from "../../engine/physics/collision/CollisionSystem2D";
import { PongSpinSystem } from "./systems/PongSpinSystem";
import { PongEntityFactory } from "./EntityFactory";
import { AIPongController } from "./input/AIPongController";
import { NetworkController } from "./input/NetworkController";
import { type PongState, type PongInput } from "./types";
import { PongConfigSchema, PongConfig } from "./types/PongConfigSchema";
import { ConfigService } from "../../engine/services/ConfigService";
import { Renderer } from "../../engine/rendering/Renderer";
import { drawPongBall } from "./rendering/PongCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";
import { MutatorSystem } from "../../engine/systems/MutatorSystem";
import { SystemPhase } from "../../engine/core/System";

export type PongMode = "local" | "ai" | "online";

/**
 * Controlador principal del juego Pong.
 *
 * @remarks
 * Implementa una física de rebotes basada en el ángulo de incidencia y el movimiento
 * relativo de las paletas (spin). Gestiona modos de juego contra IA o multijugador local.
 */
export class PongGame extends BaseGame<PongState, PongInput> {
  private stateSystem!: PongGameStateSystem;
  private assetLoader: AssetLoader;
  private aiController?: AIPongController;
  private networkController?: NetworkController;
  public readonly gameId = "pong";
  private config: PongConfig;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, mode?: PongMode } | PongMode = "local") {
    const isConfig = typeof config === "object" && config !== null;
    const mode = isConfig
      ? (config.gameOptions?.mode as PongMode || config.mode || "local")
      : config;
    const isMultiplayer = isConfig ? config.isMultiplayer : false;
    const seed = isConfig ? (config.gameOptions?.seed as number || config.seed) : undefined;

    super({
      pauseKey: "Escape",
      isMultiplayer,
      gameOptions: { mode, seed }
    });
    this.assetLoader = new AssetLoader();
  }

  public override async init(): Promise<void> {
    const rawConfig = require("./config/pong.json");
    const baseConfig = ConfigService.load(this.gameId, PongConfigSchema, rawConfig);

    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig }) as PongConfig
      : { ...baseConfig };

    this.world.setResource("GameConfig", this.config);
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();
    await super.init();
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("hit", "/audio/hit.mp3"),
        audio.loadSFX("score", "/audio/score.mp3"),
        audio.loadSFX("wall", "/audio/hit.mp3"),
        audio.loadSFX("game_over", "/audio/game_over.mp3"),
      ]);
    } catch (e) {
      console.warn("[Pong] Asset preloading failed.", e);
    }
  }

  protected registerSystems(): void {
    const mode = this._config.gameOptions?.mode || "local";
    const aiDifficulty = mode === "ai" ? "medium" : undefined;

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("p1Up", ["KeyW"]);
    this.unifiedInput.bind("p1Down", ["KeyS"]);
    this.unifiedInput.bind("p2Up", ["ArrowUp"]);
    this.unifiedInput.bind("p2Down", ["ArrowDown"]);

    this.stateSystem = new PongGameStateSystem(this.config);
    this.world.addSystem(this.unifiedInput, { phase: SystemPhase.Input });

    if (mode === "online") {
      this.networkController = new NetworkController();
      this.world.addSystem(new PongInputSystem(undefined, this.networkController), { phase: SystemPhase.Simulation });
    } else {
      this.world.addSystem(new PongInputSystem(aiDifficulty), { phase: SystemPhase.Simulation });
    }

    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new PongCollisionSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(new PongSpinSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(this.stateSystem, { phase: SystemPhase.GameRules });

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators), { phase: SystemPhase.Simulation });

    // Visual / Presentation
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
  }

  protected initializeEntities(): void {
    PongEntityFactory.createBall(this.world);
    PongEntityFactory.createPaddle(this.world, "left");
    PongEntityFactory.createPaddle(this.world, "right");
    PongEntityFactory.createGameState(this.world);
  }

  public initializeRenderer(renderer: Renderer<unknown>): void {
    if (renderer.type === "canvas") {
      renderer.registerShape("circle", drawPongBall); // Override default circle with spinning ball
    }
  }

  public getGameState(): PongState {
    const state = this.world.getSingleton<PongState>("PongState");
    return state ? { ...state } : { type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1, gameOverLogged: false };
  }

  public isGameOver(): boolean {
    return this.stateSystem.isGameOver();
  }

  protected _onBeforeRestart(): void {
    this.stateSystem.resetGameOverState(this.world);
  }

  protected shouldStallSimulation(): boolean {
    if (this.networkController) {
      // Accessing the internal tick of PongInputSystem is the intended approach,
      // but for simplicity we check if any future input is missing.
      // A more robust implementation would pass the current simulation tick.
      const inputSystem = (this.world as unknown as { systems: unknown[] }).systems?.find((s): s is PongInputSystem => s instanceof PongInputSystem);
      return !this.networkController.hasInputForTick((inputSystem as unknown as { currentTick: number })?.currentTick + 1 || 0);
    }
    return false;
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (this._config.gameOptions?.mode !== "online" || !state) return;

    if (this.networkController && state.input_relay) {
        this.networkController.onInputReceived({
            tick: state.tick as number,
            input: state.input as PongInput
        });
    }
  }
}

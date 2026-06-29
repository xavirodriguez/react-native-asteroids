/* eslint-disable @typescript-eslint/no-require-imports */
import { BaseGame } from "@tiny-aster/core";
import { MovementSystem } from "@tiny-aster/core";
import { BoundarySystem } from "@tiny-aster/core";
import { JuiceSystem } from "@tiny-aster/core";
import { ScreenShakeSystem } from "@tiny-aster/core";
import { RenderUpdateSystem } from "@tiny-aster/core";
import { AssetLoader } from "@tiny-aster/core";
import { PongCollisionSystem } from "./systems/PongCollisionSystem";
import { PongGameStateSystem } from "./systems/PongGameStateSystem";
import { PongVelocityGuardrailSystem } from "./systems/PongVelocityGuardrailSystem";
import { PongInputSystem } from "./systems/PongInputSystem";
import { CollisionSystem2D } from "@tiny-aster/core";
import { PongSpinSystem } from "./systems/PongSpinSystem";
import { PongEntityFactory } from "./EntityFactory";
import { NetworkController } from "./input/NetworkController";
import { type PongState, type PongInput, type PongComponentRegistry } from "./types";
import { PongConfigSchema, PongConfig } from "./types/PongConfigSchema";
import { ConfigService } from "@tiny-aster/core";
import { Renderer } from "@tiny-aster/core";
import { drawPongBall } from "./rendering/PongCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";
import { MutatorSystem } from "@tiny-aster/core";
import { SystemPhase } from "@tiny-aster/core";

export type PongMode = "local" | "ai" | "online";

/**
 * Controlador principal del juego Pong.
 *
 * @remarks
 * Implementa una física de rebotes basada en el ángulo de incidencia y el movimiento
 * relativo de las paletas (spin). Gestiona modos de juego contra IA o multijugador local.
 */
export class PongGame extends BaseGame<PongState, PongInput, PongComponentRegistry> {
  private stateSystem!: PongGameStateSystem;
  private assetLoader: AssetLoader;
  private networkController?: NetworkController;
  public readonly gameId = "pong";
  private config!: PongConfig;

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

  public override async initialize(): Promise<void> {
    const rawConfig = require("./config/pong.json");
    const baseConfig = ConfigService.load<PongConfig>(this.gameId, PongConfigSchema, rawConfig);

    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => (m as any).apply(cfg), { ...baseConfig }) as PongConfig
      : { ...baseConfig };

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: this.config.WIDTH, height: this.config.HEIGHT });
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();

    this.registerSystems();
    this.initializeEntities();
  }

  public override update(dt: number): void {
      this.world.update(dt);
  }

  private async onPreloadAssets(): Promise<void> {
    // Audio preloading moved to game logic or specific service if needed
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
    this.world.addSystem(this.unifiedInput as any, { phase: SystemPhase.Input });

    if (mode === "online") {
      this.networkController = new NetworkController();
      this.world.addSystem(new PongInputSystem(undefined, this.networkController), { phase: SystemPhase.Simulation });
    } else {
      this.world.addSystem(new PongInputSystem(aiDifficulty as any), { phase: SystemPhase.Simulation });
    }

    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PongSpinSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PongVelocityGuardrailSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });

    this.world.addSystem(new PongCollisionSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.stateSystem, { phase: SystemPhase.GameRules });

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators as any), { phase: SystemPhase.Simulation });

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

  public initializeRenderer(renderer: Renderer<PongComponentRegistry>): void {
    if ((renderer as any).type === "canvas") {
      (renderer as any).registerShape("circle", drawPongBall); // Override default circle with spinning ball
    }
  }

  public getGameState(): PongState {
    const state = this.world.getSingleton("PongState");
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
      const inputSystem = (this.world as any).systems?.find((s: any) => s.system instanceof PongInputSystem)?.system as PongInputSystem;
      return !this.networkController.hasInputForTick(inputSystem?.currentTick + 1 || 0);
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

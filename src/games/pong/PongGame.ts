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
import { PONG_CONFIG, type PongState, type PongInput } from "./types";
import { Renderer } from "../../engine/rendering/Renderer";
import { drawPongBall } from "./rendering/PongCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";

export type PongMode = "local" | "ai" | "online";

export class PongGame extends BaseGame<PongState, PongInput> {
  private stateSystem!: PongGameStateSystem;
  private assetLoader: AssetLoader;
  private aiController?: AIPongController;
  private networkController?: NetworkController;
  public readonly gameId = "pong";
  private config: typeof PONG_CONFIG;

  constructor(config: { isMultiplayer?: boolean, seed?: number, mode?: PongMode } | PongMode = "local") {
    const isConfig = typeof config === "object" && config !== null;
    const mode = isConfig ? (config.mode || "local") : config;
    const isMultiplayer = isConfig ? config.isMultiplayer : false;
    const seed = isConfig ? config.seed : undefined;

    super({
      pauseKey: "Escape",
      isMultiplayer,
      gameOptions: { mode, seed }
    });
    this.assetLoader = new AssetLoader();
  }

  public override async init(): Promise<void> {
    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...PONG_CONFIG }) as typeof PONG_CONFIG
      : { ...PONG_CONFIG };

    await super.init();
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
    this.world.addSystem(this.unifiedInput);
    this.world.addSystem(new PongInputSystem(aiDifficulty));
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new JuiceSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new CollisionSystem2D());
    this.world.addSystem(new PongCollisionSystem());
    this.world.addSystem(new PongSpinSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new RenderUpdateSystem());
    this.world.addSystem(this.stateSystem);
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
    return this.stateSystem.getState();
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
}

import { BaseGame } from "../../engine/core/BaseGame";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { BoundarySystem } from "../../engine/systems/BoundarySystem";
import { JuiceSystem } from "../../engine/systems/JuiceSystem";
import { ScreenShakeSystem } from "../../engine/systems/ScreenShakeSystem";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { InputManager } from "../../engine/input/InputManager";
import { PongCollisionSystem } from "./systems/PongCollisionSystem";
import { PongGameStateSystem } from "./systems/PongGameStateSystem";
import { PongInputSystem } from "./systems/PongInputSystem";
import { PongEntityFactory } from "./EntityFactory";
import { PongTouchController } from "./input/PongTouchController";
import { AIPongController } from "./input/AIPongController";
import { NetworkController } from "./input/NetworkController";
import { PONG_CONFIG, type PongState, type PongInput } from "./types";
import { RandomService } from "../../engine/utils/RandomService";

const PONG_KEYMAP = {
  "KeyW": "p1Up", "KeyS": "p1Down",
  "ArrowUp": "p2Up", "ArrowDown": "p2Down",
} as const;

const DEFAULT_PONG_INPUT: PongInput = {
  p1Up: false, p1Down: false, p2Up: false, p2Down: false
};

export type PongMode = "local" | "ai" | "online";

export class PongGame extends BaseGame<PongState, PongInput> {
  private stateSystem!: PongGameStateSystem;
  private assetLoader: AssetLoader;
  private inputManager!: InputManager<PongInput>;
  private aiController?: AIPongController;
  private networkController?: NetworkController;

  constructor(mode: PongMode = "local") {
    super({ pauseKey: "Escape", gameOptions: { mode } });
    this.assetLoader = new AssetLoader();
  }

  private setupControllers(mode: PongMode): void {
    this.inputManager.addController(
      new KeyboardController<PongInput>(PONG_KEYMAP, DEFAULT_PONG_INPUT)
    );
    this.inputManager.addController(new PongTouchController());

    if (mode === "ai") {
      this.aiController = new AIPongController("medium");
      this.inputManager.addController(this.aiController);
    } else if (mode === "online") {
      this.networkController = new NetworkController();
      this.inputManager.addController(this.networkController);
    }
  }

  protected registerSystems(): void {
    const mode = this._config.gameOptions?.mode || "local";
    this.inputManager = new InputManager<PongInput>();
    this.setupControllers(mode);

    this.stateSystem = new PongGameStateSystem();
    this.world.addSystem(new PongInputSystem(this.inputManager));
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new JuiceSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new PongCollisionSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(this.stateSystem);
  }

  protected initializeEntities(): void {
    PongEntityFactory.createBall(this.world);
    PongEntityFactory.createPaddle(this.world, "left");
    PongEntityFactory.createPaddle(this.world, "right");
    PongEntityFactory.createGameState(this.world);
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
      // Access the internal tick of PongInputSystem would be ideal,
      // but for simplicity we check if any future input is missing.
      // A more robust implementation would pass the current simulation tick.
      const inputSystem = (this.world as any).systems?.find((s: any) => s instanceof PongInputSystem);
      return !this.networkController.hasInputForTick(inputSystem?.currentTick + 1 || 0);
    }
    return false;
  }
}

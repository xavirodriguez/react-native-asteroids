import { BaseGame } from "../../engine/core/BaseGame";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { TouchController } from "../../engine/input/TouchController";
import { PongCollisionSystem } from "./systems/PongCollisionSystem";
import { PongGameStateSystem } from "./systems/PongGameStateSystem";
import { PongEntityFactory } from "./EntityFactory";
import { PONG_CONFIG, type PongState, type PongInput } from "./types";

const PONG_KEYMAP = {
  "KeyW": "p1Up", "KeyS": "p1Down",
  "ArrowUp": "p2Up", "ArrowDown": "p2Down",
} as const;

const DEFAULT_PONG_INPUT: PongInput = {
  p1Up: false, p1Down: false, p2Up: false, p2Down: false
};

export class PongGame extends BaseGame<PongState, PongInput> {
  private stateSystem!: PongGameStateSystem;
  private assetLoader: AssetLoader;

  constructor() {
    super({ pauseKey: "Escape" });
    this.assetLoader = new AssetLoader();
  }

  protected registerSystems(): void {
    this.inputManager.addController(
      new KeyboardController<PongInput>(PONG_KEYMAP, DEFAULT_PONG_INPUT)
    );
    this.inputManager.addController(new TouchController<PongInput>());

    this.stateSystem = new PongGameStateSystem();
    this.world.addSystem(new PongCollisionSystem());
    this.world.addSystem(new MovementSystem(PONG_CONFIG.WIDTH, PONG_CONFIG.HEIGHT));
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
}

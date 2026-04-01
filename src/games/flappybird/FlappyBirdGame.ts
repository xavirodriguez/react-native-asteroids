import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { FlappyBirdState, FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE } from "./types/FlappyBirdTypes";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { FlappyBirdGameScene } from "./scenes/FlappyBirdGameScene";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { Renderer } from "../../engine/rendering/Renderer";
import { getGameState } from "./GameUtils";
import {
  drawFlappyBird,
  drawFlappyPipe,
  drawFlappyGround,
  scrollingBackgroundEffect
} from "./rendering/FlappyBirdCanvasVisuals";

/**
 * Main game controller for Flappy Bird.
 */
export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput>
  implements IFlappyBirdGame {

  private gameStateSystem: FlappyBirdGameStateSystem;

  constructor() {
    super({
      pauseKey: FLAPPY_CONFIG.KEYS.PAUSE,
      restartKey: FLAPPY_CONFIG.KEYS.RESTART
    });
  }

  protected registerSystems(): void {
    // Input setup
    const DEFAULT_INPUT: FlappyBirdInput = { flap: false };
    const FLAPPY_KEYMAP = {
      [FLAPPY_CONFIG.KEYS.FLAP]: "flap" as const,
    };
    this.inputManager.addController(new KeyboardController<FlappyBirdInput>(FLAPPY_KEYMAP, DEFAULT_INPUT));
    this.inputManager.addController(new TouchController<FlappyBirdInput>());

    // Shared state system to allow for isGameOver check
    this.gameStateSystem = new FlappyBirdGameStateSystem(this);

    // Initial scene setup
    const gameScene = new FlappyBirdGameScene(
      this,
      this.inputManager,
      this.gameStateSystem
    );

    this.sceneManager.transitionTo(gameScene);
  }

  protected initializeEntities(): void {
    // Entities are initialized in gameScene.onEnter()
  }

  public initializeRenderer(renderer: Renderer): void {
    if (renderer.type === "canvas") {
      renderer.registerShape("bird", drawFlappyBird);
      renderer.registerShape("pipe", drawFlappyPipe);
      renderer.registerShape("ground", drawFlappyGround);
      renderer.registerBackgroundEffect("scrollingSky", scrollingBackgroundEffect);
    }
  }

  public getGameState(): FlappyBirdState {
    return getGameState(this.getWorld());
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState();
    this.registerSystems();
  }
}

export class NullFlappyBirdGame implements IFlappyBirdGame {
  private _world = new World();
  public start() {} public stop() {} public pause() {} public resume() {}
  public restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_FLAPPY_STATE; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}

import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { TouchController } from "../../engine/input/TouchController";
import { FlappyBirdState, FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE } from "./types/FlappyBirdTypes";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { FlappyBirdInputSystem } from "./systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "./systems/FlappyBirdCollisionSystem";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { FlappyBirdRenderSystem } from "./systems/FlappyBirdRenderSystem";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { Renderer } from "../../engine/rendering/Renderer";
import { getGameState } from "./GameUtils";
import {
  createBird,
  createGameState,
  createGround
} from "./EntityFactory";
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
  private isMultiplayer = false;

  constructor() {
    super({
      pauseKey: FLAPPY_CONFIG.KEYS.PAUSE,
      restartKey: FLAPPY_CONFIG.KEYS.RESTART
    });
  }

  protected registerSystems(): void {
    const DEFAULT_INPUT: FlappyBirdInput = { flap: false };
    const FLAPPY_KEYMAP = {
      [FLAPPY_CONFIG.KEYS.FLAP]: "flap" as const,
    };

    this.inputManager.cleanup();
    this.inputManager.addController(new KeyboardController<FlappyBirdInput>(FLAPPY_KEYMAP, DEFAULT_INPUT));
    this.inputManager.addController(new TouchController<FlappyBirdInput>());

    this.gameStateSystem = new FlappyBirdGameStateSystem(this);

    const inputSys = new FlappyBirdInputSystem(this.inputManager);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new FlappyBirdCollisionSystem(this));
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new FlappyBirdRenderSystem());
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public updateFromServer(state: any) {
    if (!this.isMultiplayer || !state) return;
    this.world.clear();

    if (state.players) {
        state.players.forEach((player: any) => {
            const b = this.world.createEntity();
            this.world.addComponent(b, { type: "Transform", x: player.x, y: player.y, rotation: 0, scaleX: 1, scaleY: 1 });
            this.world.addComponent(b, { type: "Render", shape: "bird", size: 15, color: player.alive ? "yellow" : "gray", rotation: 0 });
            this.world.addComponent(b, { type: "Bird", velocityY: player.velocityY, isAlive: player.alive });
        });
    }

    if (state.pipes) {
        state.pipes.forEach((pipe: any) => {
            const p = this.world.createEntity();
            this.world.addComponent(p, { type: "Transform", x: pipe.x, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
            this.world.addComponent(p, { type: "Render", shape: "pipe", size: 60, color: "green", rotation: 0 });
            this.world.addComponent(p, { type: "Pipe", gapY: pipe.gapY, gapSize: 140, scored: false });
        });
    }
  }

  protected initializeEntities(): void {
    if (this.isMultiplayer) return;
    createGameState(this.world);
    createBird({ world: this.world, x: FLAPPY_CONFIG.BIRD_X, y: FLAPPY_CONFIG.BIRD_START_Y });
    createGround(this.world);
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

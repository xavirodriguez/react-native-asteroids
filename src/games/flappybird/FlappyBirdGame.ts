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
import { FlappyBirdGlideSystem } from "./systems/FlappyBirdGlideSystem";
import { InputBufferSystem } from "../../engine/systems/InputBufferSystem";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { JuiceSystem } from "../../engine/systems/JuiceSystem";
import { Renderer } from "../../engine/rendering/Renderer";
import { InputManager } from "../../engine/input/InputManager";
import {
  createBird,
  createGameState,
  createGround
} from "./EntityFactory";
import {
  drawFlappyBird,
  drawFlappyPipe,
  drawFlappyGround,
  scrollingBackgroundEffect,
  drawSpeedLines
} from "./rendering/FlappyBirdCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";

/**
 * Main game controller for Flappy Bird.
 */
export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput>
  implements IFlappyBirdGame {

  private gameStateSystem: FlappyBirdGameStateSystem;
  private _localInputManager: InputManager<FlappyBirdInput> | null = null;
  public readonly gameId = "flappybird";
  private config: typeof FLAPPY_CONFIG;

  constructor(config: { isMultiplayer?: boolean, seed?: number } = {}) {
    super({
      pauseKey: FLAPPY_CONFIG.KEYS.PAUSE,
      restartKey: FLAPPY_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { seed: config.seed }
    });
  }

  public override async init(): Promise<void> {
    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...FLAPPY_CONFIG })
      : { ...FLAPPY_CONFIG };

    await super.init();
  }

  protected registerSystems(): void {
    const DEFAULT_INPUT: FlappyBirdInput = { flap: false };
    const FLAPPY_KEYMAP = {
      [FLAPPY_CONFIG.KEYS.FLAP]: "flap" as const,
    };

    // Fix initialization order: Create if not exists since super() calls this
    this._localInputManager = this._localInputManager || new InputManager<FlappyBirdInput>();

    this._localInputManager.cleanup();
    this._localInputManager.addController(new KeyboardController<FlappyBirdInput>(FLAPPY_KEYMAP, DEFAULT_INPUT));
    this._localInputManager.addController(new TouchController<FlappyBirdInput>());

    this.gameStateSystem = new FlappyBirdGameStateSystem(this, this.config);

    const inputSys = new FlappyBirdInputSystem(this._localInputManager, this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(new InputBufferSystem());
    this.world.addSystem(inputSys);
    this.world.addSystem(new FlappyBirdGlideSystem());
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new JuiceSystem());
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
      renderer.registerBackgroundEffect("speedLines", drawSpeedLines);
    }
  }

  public getGameState(): FlappyBirdState {
    return this.getWorld().getSingleton<FlappyBirdState>("FlappyState") || { ...INITIAL_FLAPPY_STATE };
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState(this.world);
  }
}

export class NullFlappyBirdGame implements IFlappyBirdGame {
  private _world = new World();
  public start() {} public stop() {} public pause() {} public resume() {}
  public async restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_FLAPPY_STATE; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}

import { Scene } from "../../../engine/scenes/Scene";
import { World } from "../../../engine/core/World";
import { InputManager } from "../../../engine/input/InputManager";
import { MovementSystem } from "../../../engine/systems/MovementSystem";
import { FlappyBirdInputSystem } from "../systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "../systems/FlappyBirdCollisionSystem";
import { FlappyBirdGameStateSystem } from "../systems/FlappyBirdGameStateSystem";
import { FlappyBirdRenderSystem } from "../systems/FlappyBirdRenderSystem";
import {
  createBird,
  createGameState,
  createGround
} from "../EntityFactory";
import { FlappyBirdInput, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { IFlappyBirdGame } from "../types/GameInterfaces";
import { KeyboardController } from "../../../engine/input/KeyboardController";
import { TouchController } from "../../../engine/input/TouchController";

/**
 * Main gameplay scene for Flappy Bird.
 */
export class FlappyBirdGameScene extends Scene {
  private game: IFlappyBirdGame;
  private inputManager: InputManager<FlappyBirdInput>;
  private gameStateSystem: FlappyBirdGameStateSystem;

  constructor(
    game: IFlappyBirdGame,
    inputManager: InputManager<FlappyBirdInput>,
    gameStateSystem: FlappyBirdGameStateSystem
  ) {
    super(new World());
    this.game = game;
    this.inputManager = inputManager;
    this.gameStateSystem = gameStateSystem;
  }

  public onEnter(): void {
    // Register systems
    this.world.addSystem(new FlappyBirdInputSystem(this.inputManager));
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new FlappyBirdCollisionSystem(this.game));
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new FlappyBirdRenderSystem());

    // Initial entities
    createGameState(this.world);
    createBird({ world: this.world, x: FLAPPY_CONFIG.BIRD_X, y: FLAPPY_CONFIG.BIRD_START_Y });
    createGround(this.world);
  }
}

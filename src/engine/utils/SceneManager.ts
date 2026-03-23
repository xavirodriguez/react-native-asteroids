import { World } from "../core/World";

export interface Scene {
  name: string;
  onEnter: (world: World) => void;
  onExit?: (world: World) => void;
}

/**
 * Utility to manage game scenes and their transitions.
 * Handles the loading and unloading of entities for different game states (e.g., Menu, Playing, GameOver).
 */
export class SceneManager {
  private scenes = new Map<string, Scene>();
  private currentScene?: Scene;

  constructor(private world: World) {}

  /**
   * Registers a new scene.
   */
  public registerScene(scene: Scene): void {
    this.scenes.set(scene.name, scene);
  }

  /**
   * Switches to a different scene.
   * Clears the current world and runs onEnter logic of the new scene.
   */
  public loadScene(name: string): void {
    const nextScene = this.scenes.get(name);
    if (!nextScene) {
      throw new Error(`Scene '${name}' not found.`);
    }

    if (this.currentScene?.onExit) {
      this.currentScene.onExit(this.world);
    }

    this.world.clear();
    nextScene.onEnter(this.world);
    this.currentScene = nextScene;
  }

  /**
   * Returns the name of the current active scene.
   */
  public getCurrentSceneName(): string | undefined {
    return this.currentScene?.name;
  }
}

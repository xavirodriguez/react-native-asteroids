import { Scene } from "./Scene";
import { Renderer } from "../rendering/Renderer";

/**
 * Manages game scenes and their lifecycle transitions.
 * Responsible for updating and rendering the active scene.
 */
export class SceneManager {
  private currentScene: Scene | null = null;

  /**
   * Transitions to a new scene.
   * Calls onExit() on the old scene and onEnter() on the new one.
   *
   * @param scene - The new scene to transition to.
   */
  public transitionTo(scene: Scene): void {
    if (this.currentScene) {
      this.currentScene.onExit();
    }

    this.currentScene = scene;
    this.currentScene.onEnter();
  }

  /**
   * Restarts the current scene.
   */
  public restartCurrentScene(): void {
    if (this.currentScene) {
      this.currentScene.onExit();
      const world = this.currentScene.getWorld();
      world.clear();
      world.clearSystems();
      this.currentScene.onEnter();
    }
  }

  /**
   * Pauses the active scene.
   */
  public pause(): void {
    if (this.currentScene) {
      this.currentScene.onPause();
    }
  }

  /**
   * Resumes the active scene.
   */
  public resume(): void {
    if (this.currentScene) {
      this.currentScene.onResume();
    }
  }

  /**
   * Updates the current scene.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  public update(deltaTime: number): void {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  /**
   * Renders the current scene.
   *
   * @param renderer - The renderer instance to use.
   */
  public render(renderer: Renderer): void {
    if (this.currentScene) {
      this.currentScene.render(renderer);
    }
  }

  /**
   * Gets the currently active scene.
   *
   * @returns The active scene or null if none is set.
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }
}

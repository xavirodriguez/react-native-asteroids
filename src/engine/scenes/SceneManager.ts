import { Scene } from "./Scene";
import { Renderer } from "../rendering/Renderer";
import { runLifecycle } from "../utils/LifecycleUtils";

/**
 * Manages game scenes and their lifecycle transitions.
 * Responsible for updating and rendering the active scene.
 */
export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneStack: Scene[] = [];

  /**
   * Transitions to a new scene, clearing the current stack.
   * Calls onExit() on the old scene and onEnter() on the new one.
   *
   * @param scene - The new scene to transition to.
   */
  public async transitionTo(scene: Scene): Promise<void> {
    if (this.currentScene) {
      await runLifecycle(() => this.currentScene!.onExit());
    }

    await runLifecycle(() => scene.onEnter());

    // Sychronous state mutations at the end
    this.sceneStack = [scene];
    this.currentScene = scene;
  }

  /**
   * Pushes a new scene onto the stack.
   * The current scene is paused before the new scene is entered.
   */
  public async push(scene: Scene): Promise<void> {
    if (this.currentScene) {
      await runLifecycle(() => this.currentScene!.onPause());
    }

    await runLifecycle(() => scene.onEnter());

    // Sychronous state mutations at the end
    this.sceneStack.push(scene);
    this.currentScene = scene;
  }

  /**
   * Pops the current scene from the stack.
   * The previous scene is resumed.
   */
  public async pop(): Promise<void> {
    if (this.sceneStack.length <= 1) return;

    const poppedScene = this.sceneStack[this.sceneStack.length - 1];
    if (poppedScene) {
      await runLifecycle(() => poppedScene.onExit());
    }

    const nextScene = this.sceneStack[this.sceneStack.length - 2];
    if (nextScene) {
      await runLifecycle(() => nextScene.onResume());
    }

    // Sychronous state mutations at the end
    this.sceneStack.pop();
    this.currentScene = this.sceneStack[this.sceneStack.length - 1] || null;
  }

  /**
   * Restarts the current scene.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
      await runLifecycle(() => this.currentScene!.onExit());
      const world = this.currentScene.getWorld();
      world.clear();
      world.clearSystems();
      await runLifecycle(() => this.currentScene!.onEnter());
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

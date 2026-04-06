import { Scene } from "./Scene";
import { Renderer } from "../rendering/Renderer";
import { runLifecycle } from "../utils/LifecycleUtils";

/**
 * Manages game scenes and their lifecycle transitions.
 * Responsible for updating and rendering the active scene.
 *
 * Principle 3: Atomic State Transitions
 * Lifecycle methods (onExit, onEnter, onPause, onResume) are executed
 * before the synchronous stack mutation.
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
    // 1. Perform async/lifecycle work FIRST
    if (this.currentScene) {
      await runLifecycle(() => this.currentScene!.onExit());
    }

    await runLifecycle(() => scene.onEnter());

    // 2. Perform synchronous mutation LAST
    this.sceneStack = [scene];
    this.currentScene = scene;
  }

  /**
   * Pushes a new scene onto the stack.
   * The current scene is paused before the new scene is entered.
   */
  public async push(scene: Scene): Promise<void> {
    // 1. Perform async/lifecycle work FIRST
    if (this.currentScene) {
      await runLifecycle(() => this.currentScene!.onPause());
    }

    await runLifecycle(() => scene.onEnter());

    // 2. Perform synchronous mutation LAST
    this.sceneStack.push(scene);
    this.currentScene = scene;
  }

  /**
   * Pops the current scene from the stack.
   * The previous scene is resumed.
   */
  public async pop(): Promise<void> {
    if (this.sceneStack.length <= 1) return;

    // 1. Perform async/lifecycle work FIRST
    const poppedScene = this.sceneStack[this.sceneStack.length - 1];
    await runLifecycle(() => poppedScene.onExit());

    const nextScene = this.sceneStack[this.sceneStack.length - 2];
    if (nextScene) {
      await runLifecycle(() => nextScene.onResume());
    }

    // 2. Perform synchronous mutation LAST
    this.sceneStack.pop();
    this.currentScene = nextScene;
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
      // pause/resume are often called in high-frequency loops or via sync events
      // so we keep them sync if possible, or use runLifecycle without await if they are void
      runLifecycle(() => this.currentScene!.onPause());
    }
  }

  /**
   * Resumes the active scene.
   */
  public resume(): void {
    if (this.currentScene) {
      runLifecycle(() => this.currentScene!.onResume());
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

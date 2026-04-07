import { Scene } from "./Scene";
import { World } from "../core/World";
import { runLifecycle } from "../utils/LifecycleUtils";

export type TransitionType = 'instant' | 'fade' | 'slide';

export interface SceneTransition {
  type: TransitionType;
  durationMs: number;
}

/**
 * Manages a stack of game scenes and their lifecycle transitions.
 */
export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneStack: Scene[] = [];
  private scenes = new Map<string, Scene>();

  /**
   * Registers a scene by name.
   */
  public register(scene: Scene): void {
    const name = (scene as any).name || "Unnamed Scene";
    if (name === "Unnamed Scene") {
      console.warn("Scene registered without a unique name. This may cause collisions.");
    }
    this.scenes.set(name, scene);
  }

  /**
   * Transitions to a new scene, clearing the current stack.
   * Calls onExit() on the old scene and onEnter() on the new one.
   *
   * Principle 3: Atomic State Transitions.
   * Asynchronous lifecycle work is awaited BEFORE synchronous mutations.
   *
   * @param scene - The new scene to transition to.
   */
  public async transitionTo(scene: Scene): Promise<void> {
    const prev = this.currentScene;

    if (prev) {
      await runLifecycle(() => (prev as any).onExit ? (prev as any).onExit(prev.getWorld()) : (prev as any).onExit());
    }

    await runLifecycle(() => (scene as any).onEnter ? (scene as any).onEnter(scene.getWorld()) : (scene as any).onEnter());

    // Atomic synchronous mutation at the end
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

    await runLifecycle(() => (scene as any).onEnter ? (scene as any).onEnter(scene.getWorld()) : (scene as any).onEnter());

    // Atomic synchronous mutation at the end
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
      await runLifecycle(() => (poppedScene as any).onExit ? (poppedScene as any).onExit(poppedScene.getWorld()) : (poppedScene as any).onExit());
    }

    // Atomic synchronous mutation
    this.sceneStack.pop();
    this.currentScene = this.sceneStack[this.sceneStack.length - 1];

    if (this.currentScene) {
      await runLifecycle(() => this.currentScene!.onResume());
    }
  }

  /**
   * Restarts the current scene.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
      const scene = this.currentScene;
      const world = scene.getWorld();

      await runLifecycle(() => (scene as any).onExit ? (scene as any).onExit(world) : (scene as any).onExit());

      // Synchronous mutations
      world.clear();
      world.clearSystems();

      await runLifecycle(() => (scene as any).onEnter ? (scene as any).onEnter(world) : (scene as any).onEnter());
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
  public render(renderer: any): void {
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

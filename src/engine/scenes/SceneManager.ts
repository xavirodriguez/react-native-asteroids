import { Scene } from "./Scene";
import { World } from "../core/World";
import { runLifecycle } from "../utils/Lifecycle";

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
   * @param scene - The new scene to transition to.
   */
  public transitionTo(scene: Scene): void {
    const prev = this.currentScene;

    this.sceneStack = [scene];
    this.currentScene = scene;

    const triggerEnter = () => {
      runLifecycle(() => (scene as any).onEnter ? (scene as any).onEnter(scene.getWorld()) : (scene as any).onEnter())
        .catch(console.error);
    };

    if (prev) {
      const exitResult = (prev as any).onExit ? (prev as any).onExit(prev.getWorld()) : (prev as any).onExit();
      if (exitResult instanceof Promise) {
        exitResult.then(triggerEnter).catch(console.error);
      } else {
        triggerEnter();
      }
    } else {
      triggerEnter();
    }
  }

  /**
   * Pushes a new scene onto the stack.
   * The current scene is paused before the new scene is entered.
   */
  public push(scene: Scene): void {
    if (this.currentScene) {
      this.currentScene.onPause();
    }
    this.sceneStack.push(scene);
    this.currentScene = scene;

    runLifecycle(() => (scene as any).onEnter ? (scene as any).onEnter(scene.getWorld()) : (scene as any).onEnter())
      .catch(console.error);
  }

  /**
   * Pops the current scene from the stack.
   * The previous scene is resumed.
   */
  public pop(): void {
    if (this.sceneStack.length <= 1) return;

    const poppedScene = this.sceneStack.pop();
    if (poppedScene) {
      runLifecycle(() => (poppedScene as any).onExit ? (poppedScene as any).onExit(poppedScene.getWorld()) : (poppedScene as any).onExit())
        .catch(console.error);
    }

    this.currentScene = this.sceneStack[this.sceneStack.length - 1];
    if (this.currentScene) {
      this.currentScene.onResume();
    }
  }

  /**
   * Restarts the current scene.
   */
  public restartCurrentScene(): void {
    if (this.currentScene) {
      const scene = this.currentScene;
      const world = scene.getWorld();

      const exitResult = (scene as any).onExit ? (scene as any).onExit(world) : (scene as any).onExit();

      const reset = () => {
        world.clear();
        world.clearSystems();
        runLifecycle(() => (scene as any).onEnter ? (scene as any).onEnter(world) : (scene as any).onEnter())
          .catch(console.error);
      };

      if (exitResult instanceof Promise) {
        exitResult.then(reset).catch(console.error);
      } else {
        reset();
      }
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

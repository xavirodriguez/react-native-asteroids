/**
 * @packageDocumentation
 * Scene management and transition control.
 * Implements a stack-based scene manager with atomic transition guarantees.
 */

import { World } from "../core/World";
import { Scene } from "./Scene";
import { runLifecycleSync, runLifecycleAsync } from "../utils/LifecycleUtils";

/**
 * Represents the current operational state of the SceneManager.
 */
export enum SceneState {
  /** No scene transition is currently in progress. */
  IDLE = "IDLE",
  /** A new scene is being initialized and entered. */
  LOADING = "LOADING",
  /** A scene is active and receiving updates. */
  ACTIVE = "ACTIVE",
  /** The current scene is being exited and cleaned up. */
  UNLOADING = "UNLOADING",
}

/**
 * Central manager for scene transitions.
 * Implements a Finite State Machine (FSM) and an atomic queue to
 * ensure only one transition occurs at a time, preventing corrupted states.
 *
 * @remarks
 * The SceneManager maintains a stack of scenes.
 * - `transitionTo` replaces the entire stack.
 * - `push` adds a scene on top (pausing the previous one).
 * - `pop` removes the top scene (resuming the previous one).
 *
 * It ensures that lifecycle hooks (`onEnter`, `onExit`, `onPause`, `onResume`)
 * are called in the correct order and that asynchronous operations are awaited.
 *
 * @responsibility Orchestrate scene transitions and lifecycle management.
 * @responsibility Provide a stable API for updating and rendering the active scene.
 */
export class SceneManager {
  /** The stack of scenes, where the last element is the active one. */
  private sceneStack: Scene[] = [];
  /** Reference to the currently active scene. */
  private currentScene: Scene | null = null;
  /** Current state of the manager's FSM. */
  private state: SceneState = SceneState.IDLE;
  /** Queue of pending transition tasks to be executed sequentially. */
  private transitionQueue: (() => Promise<void>)[] = [];
  /** Mutex flag to prevent concurrent transition processing. */
  private isProcessingTransition = false;
  /** The primary ECS world reference. */
  private world: World;

  /**
   * Creates a new SceneManager.
   * @param world - The ECS world used for managing scene lifecycles.
   */
  constructor(world: World) {
    this.world = world;
  }

  /**
   * Gets the currently active scene.
   * @returns The active {@link Scene} or null if no scene is loaded.
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Gets the current operational state.
   * @returns The current {@link SceneState}.
   */
  public getState(): SceneState {
    return this.state;
  }

  /**
   * Enqueues a transition task for sequential execution.
   * Ensures that if multiple transitions are requested rapidly,
   * they are processed one after another in the order received.
   *
   * @param task - Async function representing the transition logic.
   * @returns A promise that resolves when the task and all preceding tasks are finished.
   */
  private enqueueTransition(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transitionQueue.push(async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Internal loop to process the transition queue.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingTransition || this.transitionQueue.length === 0) {
      return;
    }

    this.isProcessingTransition = true;
    try {
      while (this.transitionQueue.length > 0) {
        const task = this.transitionQueue.shift();
        if (task) {
          await task();
        }
      }
    } finally {
      this.isProcessingTransition = false;
    }
  }

  /**
   * Atomic transition to a new scene.
   * Clears the current stack and replaces it with the new scene.
   *
   * @param scene - The new scene to transition to.
   * @returns Promise that resolves when the transition is complete.
   *
   * @remarks
   * This triggers `onExit` on the current scene and `onEnter` on the new scene.
   */
  public async transitionTo(scene: Scene): Promise<void> {
    return this.enqueueTransition(async () => {
      const previousState = this.state;
      try {
        // 1. Unload current scene if exists
        if (this.currentScene) {
          this.state = SceneState.UNLOADING;
          const oldScene = this.currentScene;
          await runLifecycleAsync(async () => {
            const sceneAsAny = oldScene as unknown as Record<string, unknown>;
            if (typeof sceneAsAny.onExit === "function") {
              await (sceneAsAny.onExit as (w: World) => Promise<void>)(oldScene.getWorld());
            }
          });
        }

        // 2. Load new scene
        this.state = SceneState.LOADING;
        this.currentScene = scene;
        this.sceneStack = [scene];

        await runLifecycleAsync(async () => {
          const sceneAsAny = scene as unknown as Record<string, unknown>;
          if (typeof sceneAsAny.onEnter === "function") {
            await (sceneAsAny.onEnter as (w: World) => Promise<void>)(scene.getWorld());
          }
        });

        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Transition failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

  /**
   * Pushes a new scene onto the stack, pausing the current one.
   * Useful for overlays, sub-menus, or temporary states.
   *
   * @param scene - The scene to push onto the stack.
   * @returns Promise that resolves when the operation is complete.
   *
   * @remarks
   * Triggers `onPause` on the current scene and `onEnter` on the new scene.
   */
  public async push(scene: Scene): Promise<void> {
    return this.enqueueTransition(async () => {
      const previousState = this.state;
      try {
        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onPause());
        }

        this.state = SceneState.LOADING;
        this.sceneStack.push(scene);
        this.currentScene = scene;

        await runLifecycleAsync(async () => {
          const sceneAsAny = scene as unknown as Record<string, unknown>;
          if (typeof sceneAsAny.onEnter === "function") {
            await (sceneAsAny.onEnter as (w: World) => Promise<void>)(scene.getWorld());
          }
        });

        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Push failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

  /**
   * Pops the current scene from the stack, resuming the previous one.
   *
   * @returns Promise that resolves when the operation is complete.
   *
   * @remarks
   * Triggers `onExit` on the popped scene and `onResume` on the resumed scene.
   * Will warn and do nothing if only one scene remains in the stack.
   */
  public async pop(): Promise<void> {
    return this.enqueueTransition(async () => {
      if (this.sceneStack.length <= 1) {
        console.warn("SceneManager: Cannot pop the last scene.");
        return;
      }

      const previousState = this.state;
      const poppedScene = this.sceneStack[this.sceneStack.length - 1];

      try {
        this.state = SceneState.UNLOADING;

        await runLifecycleAsync(async () => {
          const sceneAsAny = poppedScene as unknown as Record<string, unknown>;
          if (typeof sceneAsAny.onExit === "function") {
            await (sceneAsAny.onExit as (w: World) => Promise<void>)(poppedScene.getWorld());
          }
        });

        this.sceneStack.pop();
        this.currentScene = this.sceneStack[this.sceneStack.length - 1];

        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onResume());
        }
        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Pop failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

  /**
   * Updates the active scene.
   * Should be called every frame from the main game loop.
   *
   * @param deltaTime - Elapsed time in seconds.
   */
  public update(deltaTime: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  /**
   * Renders the active scene.
   * Should be called during the rendering phase of the game loop.
   *
   * @param alpha - Interpolation factor.
   */
  public render(alpha: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onRender(alpha);
    }
  }

  /**
   * Manually triggers the pause hook on the current scene.
   */
  public pause(): void {
    if (this.currentScene) this.currentScene.onPause();
  }

  /**
   * Manually triggers the resume hook on the current scene.
   */
  public resume(): void {
    if (this.currentScene) this.currentScene.onResume();
  }

  /**
   * Restarts the current scene by re-triggering the transition logic.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
        await this.transitionTo(this.currentScene);
    }
  }
}

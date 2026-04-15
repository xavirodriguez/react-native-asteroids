import { World } from "../core/World";
import { Scene } from "./Scene";
import { runLifecycleSync, runLifecycleAsync } from "../utils/LifecycleUtils";

export enum SceneState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
  UNLOADING = "UNLOADING",
}

/**
 * Gestor central de transiciones entre escenas.
 * Implementa una Máquina de Estados Finitos (FSM) y una cola atómica para
 * garantizar que solo ocurra una transición a la vez, evitando estados corruptos.
 */
export class SceneManager {
  private sceneStack: Scene[] = [];
  private currentScene: Scene | null = null;
  private state: SceneState = SceneState.IDLE;
  private transitionQueue: (() => Promise<void>)[] = [];
  private isProcessingTransition = false;

  constructor() {}

  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  public getState(): SceneState {
    return this.state;
  }

  /**
   * Encola una tarea de transición para ejecución secuencial.
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
            if ((oldScene as any).onExit) {
              await (oldScene as any).onExit(oldScene.getWorld());
            }
          });
        }

        // 2. Load new scene
        this.state = SceneState.LOADING;
        this.currentScene = scene;
        this.sceneStack = [scene];

        await runLifecycleAsync(async () => {
          if ((scene as any).onEnter) {
            await (scene as any).onEnter(scene.getWorld());
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
          if ((scene as any).onEnter) {
            await (scene as any).onEnter(scene.getWorld());
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
          if ((poppedScene as any).onExit) {
            await (poppedScene as any).onExit(poppedScene.getWorld());
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
   * Updates the current scene.
   */
  public update(deltaTime: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  /**
   * Renders the current scene.
   */
  public render(alpha: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onRender(alpha);
    }
  }

  public pause(): void {
    if (this.currentScene) this.currentScene.onPause();
  }

  public resume(): void {
    if (this.currentScene) this.currentScene.onResume();
  }

  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
        // Clear the scene's world before restarting to prevent duplicate entities/systems
        this.currentScene.getWorld().clear();
        await this.transitionTo(this.currentScene);
    }
  }
}

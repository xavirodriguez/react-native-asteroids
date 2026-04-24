import { World } from "../../core/World";
import { Scene } from "./Scene";
import { runLifecycleSync, runLifecycleAsync } from "../../utils/LifecycleUtils";

export enum SceneState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
  UNLOADING = "UNLOADING",
}

/**
 * Gestor central de transiciones entre escenas.
 */
export class SceneManager {
  private sceneStack: Scene[] = [];
  private currentScene: Scene | null = null;
  private state: SceneState = SceneState.IDLE;
  private transitionQueue: (() => Promise<void>)[] = [];
  private isProcessingTransition = false;
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  public getState(): SceneState {
    return this.state;
  }

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

  public async transitionTo(scene: Scene): Promise<void> {
    return this.enqueueTransition(async () => {
      const previousState = this.state;
      try {
        if (this.currentScene) {
          this.state = SceneState.UNLOADING;
          const oldScene = this.currentScene;
          await runLifecycleAsync(async () => {
             await oldScene.onExit(oldScene.getWorld());
          });
        }

        this.state = SceneState.LOADING;
        this.currentScene = scene;
        this.sceneStack = [scene];

        await runLifecycleAsync(async () => {
          await scene.onEnter(scene.getWorld());
        });

        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Transition failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

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
          await scene.onEnter(scene.getWorld());
        });

        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Push failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

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
          await poppedScene.onExit(poppedScene.getWorld());
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

  public update(deltaTime: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onUpdate(deltaTime, this.currentScene.getWorld());
    }
  }

  public pause(): void {
    if (this.currentScene) this.currentScene.onPause();
  }

  public resume(): void {
    if (this.currentScene) this.currentScene.onResume();
  }
}

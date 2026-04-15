import { Scene } from "./Scene";
import { runLifecycleAsync, runLifecycleSync } from "../utils/LifecycleUtils";

export type TransitionType = 'instant' | 'fade' | 'slide';

export interface SceneTransition {
  type: TransitionType;
  durationMs: number;
}

/**
 * Finite State Machine for Scene Transitions.
 */
export enum SceneState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ACTIVE = 'ACTIVE',
  UNLOADING = 'UNLOADING'
}

type TransitionTask = () => Promise<void>;

/**
 * Manages a stack of game scenes and their lifecycle transitions.
 *
 * @remarks
 * Implements a formal FSM and an atomic transition queue (mutex) to prevent
 * concurrent scene state corruption and race conditions.
 */
export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneStack: Scene[] = [];
  private scenes = new Map<string, Scene>();
  private state: SceneState = SceneState.IDLE;

  private transitionQueue: TransitionTask[] = [];
  private isProcessingTransition: boolean = false;

  public register(scene: Scene): void {
    const name = scene.name || "Unnamed Scene";
    this.scenes.set(name, scene);
  }

  /**
   * Enqueues a transition task and starts processing if idle.
   */
  private async enqueueTransition(task: TransitionTask): Promise<void> {
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
    while (this.transitionQueue.length > 0) {
      const task = this.transitionQueue.shift();
      if (task) {
        await task();
      }
    }
    this.isProcessingTransition = false;
  }

  /**
   * Atomic transition to a new scene.
   * Clears the current stack and replaces it with the new scene.
   */
  public async transitionTo(scene: Scene): Promise<void> {
    return this.enqueueTransition(async () => {
      const previousState = this.state;
      try {
        // Phase 1: UNLOADING
        if (this.currentScene) {
          this.state = SceneState.UNLOADING;
          const prev = this.currentScene;
          await runLifecycleAsync(async () => {
            if ((prev as any).onExit) {
              await (prev as any).onExit(prev.getWorld());
            }
          });
        }

        // Phase 2: LOADING
        this.state = SceneState.LOADING;
        await runLifecycleAsync(async () => {
          if ((scene as any).onEnter) {
            await (scene as any).onEnter(scene.getWorld());
          }
        });

        // Phase 3: ACTIVE
        this.sceneStack = [scene];
        this.currentScene = scene;
        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Transition failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

  /**
   * Pushes a new scene onto the stack.
   */
  public async push(scene: Scene): Promise<void> {
    return this.enqueueTransition(async () => {
      const previousState = this.state;
      try {
        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onPause());
        }

        this.state = SceneState.LOADING;
        await runLifecycleAsync(async () => {
          if ((scene as any).onEnter) {
            await (scene as any).onEnter(scene.getWorld());
          }
        });

        this.sceneStack.push(scene);
        this.currentScene = scene;
        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Push failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

  /**
   * Pops the top scene from the stack.
   */
  public async pop(): Promise<void> {
    return this.enqueueTransition(async () => {
      if (this.sceneStack.length <= 1) return;

      const previousState = this.state;
      try {
        const poppedScene = this.sceneStack.pop()!;
        this.state = SceneState.UNLOADING;

        await runLifecycleAsync(async () => {
          if ((poppedScene as any).onExit) {
            await (poppedScene as any).onExit(poppedScene.getWorld());
          }
        });

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
   * Restarts the current scene.
   */
  public async restartCurrentScene(): Promise<void> {
    return this.enqueueTransition(async () => {
      if (!this.currentScene) return;

      const previousState = this.state;
      try {
        const scene = this.currentScene;
        const world = scene.getWorld();

        this.state = SceneState.UNLOADING;
        await runLifecycleAsync(async () => {
          if ((scene as any).onExit) {
            await (scene as any).onExit(world);
          }
        });

        world.clear();
        world.clearSystems();

        this.state = SceneState.LOADING;
        await runLifecycleAsync(async () => {
          if ((scene as any).onEnter) {
            await (scene as any).onEnter(world);
          }
        });

        this.state = SceneState.ACTIVE;
      } catch (error) {
        console.error("SceneManager: Restart failed", error);
        this.state = previousState;
        throw error;
      }
    });
  }

  public pause(): void {
    if (this.currentScene) {
      runLifecycleSync(() => this.currentScene!.onPause());
    }
  }

  public resume(): void {
    if (this.currentScene) {
      runLifecycleSync(() => this.currentScene!.onResume());
    }
  }

  public update(deltaTime: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  public render(renderer: import("../rendering/Renderer").Renderer): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.render(renderer);
    }
  }

  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  public getSceneState(): SceneState {
    return this.state;
  }
}

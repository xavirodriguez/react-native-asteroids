import { Scene } from "./Scene";
import { runLifecycleAsync, runLifecycleSync } from "../utils/LifecycleUtils";

export type TransitionType = 'instant' | 'fade' | 'slide';

export interface SceneTransition {
  type: TransitionType;
  durationMs: number;
}

export enum SceneState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ACTIVE = 'ACTIVE',
  UNLOADING = 'UNLOADING'
}

/**
 * Manages a stack of game scenes and their lifecycle transitions.
 */
export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneStack: Scene[] = [];
  private scenes = new Map<string, Scene>();
  private state: SceneState = SceneState.IDLE;
  private transitionLock: boolean = false;

  public register(scene: Scene): void {
    const name = (scene as any).name || "Unnamed Scene";
    this.scenes.set(name, scene);
  }

  public async transitionTo(scene: Scene): Promise<void> {
    if (this.transitionLock) {
        console.warn("SceneManager: Transition already in progress. Ignoring transitionTo.");
        return;
    }

    this.transitionLock = true;
    const previousState = this.state;
    this.state = SceneState.UNLOADING;

    try {
      const prev = this.currentScene;
      if (prev) {
        await runLifecycleAsync(async () => {
           if ((prev as any).onExit) {
             await (prev as any).onExit(prev.getWorld());
           }
        });
      }

      this.state = SceneState.LOADING;
      await runLifecycleAsync(async () => {
          if ((scene as any).onEnter) {
              await (scene as any).onEnter(scene.getWorld());
          }
      });

      this.sceneStack = [scene];
      this.currentScene = scene;
      this.state = SceneState.ACTIVE;
    } catch (error) {
      this.state = previousState;
      throw error;
    } finally {
      this.transitionLock = false;
    }
  }

  public async push(scene: Scene): Promise<void> {
    if (this.transitionLock) {
        console.warn("SceneManager: Transition already in progress. Ignoring push.");
        return;
    }

    this.transitionLock = true;
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
      this.state = previousState;
      throw error;
    } finally {
      this.transitionLock = false;
    }
  }

  public async pop(): Promise<void> {
    if (this.transitionLock || this.sceneStack.length <= 1) {
        return;
    }

    this.transitionLock = true;
    const previousState = this.state;
    this.state = SceneState.UNLOADING;

    try {
      const poppedScene = this.sceneStack[this.sceneStack.length - 1];
      if (poppedScene) {
        await runLifecycleAsync(async () => {
            if ((poppedScene as any).onExit) {
                await (poppedScene as any).onExit(poppedScene.getWorld());
            }
        });
      }

      this.sceneStack.pop();
      this.currentScene = this.sceneStack[this.sceneStack.length - 1];

      if (this.currentScene) {
        runLifecycleSync(() => this.currentScene!.onResume());
      }
      this.state = SceneState.ACTIVE;
    } catch (error) {
      this.state = previousState;
      throw error;
    } finally {
      this.transitionLock = false;
    }
  }

  public async restartCurrentScene(): Promise<void> {
    if (this.transitionLock || !this.currentScene) {
        return;
    }

    this.transitionLock = true;
    const previousState = this.state;
    this.state = SceneState.UNLOADING;

    try {
      const scene = this.currentScene;
      const world = scene.getWorld();

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
      this.state = previousState;
      throw error;
    } finally {
      this.transitionLock = false;
    }
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

  public render(renderer: any): void {
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

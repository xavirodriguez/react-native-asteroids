import { World } from "../core/World";
import { Scene } from "./Scene";
import { runLifecycleSync, runLifecycleAsync } from "../utils/LifecycleUtils";

/**
 * Operational states for the Scene Manager.
 *
 * @public
 */
export enum SceneState {
  /** No scene active or transition pending. */
  IDLE = "IDLE",
  /** `onEnter` is currently executing for a new scene. */
  LOADING = "LOADING",
  /** Scene is active and receiving updates. */
  ACTIVE = "ACTIVE",
  /** `onExit` is executing for the current scene. */
  UNLOADING = "UNLOADING",
}

/**
 * Central manager for scene transitions and lifecycle orchestration.
 *
 * @responsibility Implement a Finite State Machine (FSM) for scene flow.
 * @responsibility Manage sequential transitions via a task queue to prevent race conditions.
 * @responsibility Manage a scene stack (Push/Pop) for sub-states like pause menus.
 *
 * @remarks
 * El `SceneManager` es crítico para prevenir fugas de memoria y condiciones de carrera
 * durante la carga/descarga de recursos asíncronos. Utiliza LifecycleUtils
 * para asegurar que los ganchos de ciclo de vida se ejecuten correctamente.
 *
 * @conceptualRisk [TRANSITION_INTERRUPTION][HIGH] If an asynchronous transition
 * is interrupted by another request, the engine state may become inconsistent.
 * Mitigated by the `transitionQueue`.
 *
 * @public
 */
export class SceneManager {
  private sceneStack: Scene[] = [];
  private currentScene: Scene | null = null;
  private state: SceneState = SceneState.IDLE;
  private transitionQueue: (() => Promise<void>)[] = [];
  private isProcessingTransition = false;
  private world: World;

  /**
   * Optional hook executed whenever a new world context is established for a scene.
   *
   * @remarks
   * Useful for registering global engine systems on fresh world instances.
   */
  public onWorldCreated?: (world: World) => void | Promise<void>;

  constructor(world: World) {
    this.world = world;
  }

  /** Returns the currently active scene. */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /** Returns the current transition state of the manager. */
  public getState(): SceneState {
    return this.state;
  }

  /**
   * Enqueues a transition task for sequential execution.
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
   * Processes the transition queue.
   * Ensures only one transition happens at a time.
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
   * Realiza una transición a una nueva escena.
   * Limpia la pila actual y reemplaza la escena activa.
   *
   * @param scene - La nueva instancia de {@link Scene} a cargar.
   *
   * @remarks
   * 1. Sale de la escena actual (onExit).
   * 2. Cambia el estado a LOADING.
   * 3. Entra en la nueva escena (onEnter).
   * 4. Cambia el estado a ACTIVE.
   *
   * @precondition El manager debería estar en un estado estable (IDLE o ACTIVE).
   * @postcondition La nueva escena es la única en la pila y es la escena activa.
   * @sideEffect Se espera un incremento en la versión del mundo que apoye el re-renderizado.
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

        if (this.onWorldCreated) {
          await this.onWorldCreated(scene.getWorld());
        }

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
   *
   * @remarks
   * Useful for overlays or menus that should preserve the underlying game state.
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

        if (this.onWorldCreated) {
          await this.onWorldCreated(scene.getWorld());
        }

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
   * @remarks
   * Executes `onExit` for the popped scene and `onResume` for the top of the stack.
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
   * Dispatches the update tick to the active scene.
   */
  public update(deltaTime: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onUpdate(deltaTime, this.currentScene.getWorld());
    }
  }

  /**
   * Dispatches the render call to the active scene.
   */
  public render(alpha: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onRender(alpha);
    }
  }

  /** Pauses the active scene. */
  public pause(): void {
    if (this.currentScene) this.currentScene.onPause();
  }

  /** Resumes the active scene. */
  public resume(): void {
    if (this.currentScene) this.currentScene.onResume();
  }

  /**
   * Restarts the currently active scene.
   *
   * @remarks
   * Clears the scene's world, resets systems, and executes `onRestartCleanup()`.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
        const world = this.currentScene.getWorld();
        world.clear();
        world.clearSystems();
        this.currentScene.onRestartCleanup();
        await this.transitionTo(this.currentScene);
    }
  }
}

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
 *
 * @responsibility Implementar una Máquina de Estados Finitos (FSM) para el flujo de escenas.
 * @responsibility Gestionar transiciones secuenciales mediante una cola de tareas.
 * @responsibility Gestionar la pila de escenas (push/pop) para sub-estados como menús de pausa.
 *
 * @remarks
 * El `SceneManager` es crítico para prevenir fugas de memoria y condiciones de carrera
 * durante la carga/descarga de recursos asíncronos. Utiliza LifecycleUtils
 * para asegurar que los ganchos de ciclo de vida se ejecuten correctamente.
 *
 * @conceptualRisk [TRANSITION_INTERRUPTION][HIGH] Si una transición asíncrona es
 * interrumpida por otra, el estado del motor puede quedar inconsistente. Se mitiga
 * mediante `transitionQueue`.
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
   * @precondition El manager debe estar en un estado estable (IDLE o ACTIVE).
   * @postcondition La nueva escena es la única en la pila y es la escena activa.
   * @sideEffect Incrementa la versión del mundo para forzar re-renders.
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

  /**
   * Reinicia la escena activa actual.
   *
   * @remarks
   * Llama a `onRestartCleanup()` en la escena para limpiar recursos compartidos
   * (como semillas de PRNG o suscripciones a eventos) antes de realizar una
   * transición atómica hacia sí misma.
   *
   * @postcondition La escena vuelve a su estado inicial definido en `onEnter`.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
        this.currentScene.onRestartCleanup();
        await this.transitionTo(this.currentScene);
    }
  }
}

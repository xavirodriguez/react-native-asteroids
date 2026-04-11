import { Scene } from "./Scene";
import { World } from "../core/World";
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
 *
 * @responsibility Administrar el ciclo de vida de las escenas (Enter, Exit, Pause, Resume).
 * @responsibility Garantizar la atomicidad de las transiciones para evitar estados inconsistentes en el World.
 * @responsibility Mantener una pila (stack) de escenas para soportar menús y sub-estados.
 */
export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneStack: Scene[] = [];
  private scenes = new Map<string, Scene>();
  private state: SceneState = SceneState.IDLE;
  private transitionLock: boolean = false;

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
   * Transiciona a una nueva escena, limpiando el stack actual.
   */
  public async transitionTo(scene: Scene): Promise<void> {
    if (this.transitionLock) return;
    this.transitionLock = true;
    this.state = SceneState.UNLOADING;

    try {
      const prev = this.currentScene;
      if (prev) {
        await runLifecycleAsync(() => (prev as any).onExit ? (prev as any).onExit(prev.getWorld()) : (prev as any).onExit());
      }

      this.state = SceneState.LOADING;
      await runLifecycleAsync(() => (scene as any).onEnter ? (scene as any).onEnter(scene.getWorld()) : (scene as any).onEnter());

      // Atomic synchronous mutation at the end
      this.sceneStack = [scene];
      this.currentScene = scene;
      this.state = SceneState.ACTIVE;
    } finally {
      this.transitionLock = false;
    }
  }

  /**
   * Pushes a new scene onto the stack.
   */
  public async push(scene: Scene): Promise<void> {
    if (this.transitionLock) return;
    this.transitionLock = true;

    try {
      if (this.currentScene) {
        runLifecycleSync(() => this.currentScene!.onPause());
      }

      this.state = SceneState.LOADING;
      await runLifecycleAsync(() => (scene as any).onEnter ? (scene as any).onEnter(scene.getWorld()) : (scene as any).onEnter());

      // Atomic synchronous mutation at the end
      this.sceneStack.push(scene);
      this.currentScene = scene;
      this.state = SceneState.ACTIVE;
    } finally {
      this.transitionLock = false;
    }
  }

  /**
   * Elimina la escena actual del stack y retoma la escena anterior.
   */
  public async pop(): Promise<void> {
    if (this.transitionLock || this.sceneStack.length <= 1) return;
    this.transitionLock = true;
    this.state = SceneState.UNLOADING;

    try {
      const poppedScene = this.sceneStack[this.sceneStack.length - 1];
      if (poppedScene) {
        await runLifecycleAsync(() => (poppedScene as any).onExit ? (poppedScene as any).onExit(poppedScene.getWorld()) : (poppedScene as any).onExit());
      }

      // Atomic synchronous mutation
      this.sceneStack.pop();
      this.currentScene = this.sceneStack[this.sceneStack.length - 1];

      if (this.currentScene) {
        runLifecycleSync(() => this.currentScene!.onResume());
      }
      this.state = SceneState.ACTIVE;
    } finally {
      this.transitionLock = false;
    }
  }

  /**
   * Restarts the current scene.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.transitionLock || !this.currentScene) return;
    this.transitionLock = true;
    this.state = SceneState.UNLOADING;

    try {
      const scene = this.currentScene;
      const world = scene.getWorld();

      await runLifecycleAsync(() => (scene as any).onExit ? (scene as any).onExit(world) : (scene as any).onExit());

      // Synchronous mutations
      world.clear();
      world.clearSystems();

      this.state = SceneState.LOADING;
      await runLifecycleAsync(() => (scene as any).onEnter ? (scene as any).onEnter(world) : (scene as any).onEnter());

      this.state = SceneState.ACTIVE;
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

import { Scene } from "./Scene";
import { World } from "../core/World";

export type TransitionType = 'instant' | 'fade' | 'slide';

export interface SceneTransition {
  type: TransitionType;
  durationMs: number;
}

/**
 * Manages a stack of game scenes and their lifecycle transitions.
 */
export class SceneManager {
  private stack: Scene[] = [];
  private scenes = new Map<string, Scene>();

  /**
   * Registers a scene by name.
   */
  public register(scene: Scene): void {
    this.scenes.set(scene.name, scene);
  }

  /**
   * Pushes a new scene onto the stack.
   */
  public async push(name: string, transition?: SceneTransition): Promise<void> {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene not found: ${name}`);

    // Optional: Pause current scene
    const current = this.current();
    if (current) {
      current.onPause();
    }

    this.stack.push(scene);
    await scene.onEnter(scene.getWorld());
  }

  /**
   * Pops the current scene from the stack.
   */
  public async pop(transition?: SceneTransition): Promise<void> {
    if (this.stack.length <= 1) {
      console.warn("Cannot pop the last scene in the stack.");
      return;
    }

    const scene = this.stack.pop()!;
    await scene.onExit(scene.getWorld());

    const next = this.current();
    if (next) {
      next.onResume();
    }
  }

  /**
   * Replaces the current scene with a new one.
   */
  public async replace(name: string, transition?: SceneTransition): Promise<void> {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene not found: ${name}`);

    const current = this.stack.pop();
    if (current) {
      await current.onExit(current.getWorld());
    }

    this.stack.push(scene);
    await scene.onEnter(scene.getWorld());
  }

  /**
   * Gets the currently active scene.
   */
  public current(): Scene | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * Updates the current scene.
   */
  public update(dt: number): void {
    const active = this.current();
    if (active) {
      active.onUpdate(dt, active.getWorld());
    }
  }

  /**
   * Renders the current scene.
   */
  public render(alpha: number): void {
    const active = this.current();
    if (active) {
      active.onRender(alpha);
    }
  }

  // Backward compatibility methods
  public transitionTo(scene: Scene): void {
    this.register(scene);
    this.replace(scene.name).catch(console.error);
  }

  public getCurrentScene(): Scene | null {
    return this.current();
  }

  public restartCurrentScene(): void {
    const active = this.current();
    if (active) {
      const world = active.getWorld();
      const exitResult = active.onExit(world);

      const reset = () => {
        world.clear();
        world.clearSystems();
        const enterResult = active.onEnter(world);
        if (enterResult instanceof Promise) {
          enterResult.catch(console.error);
        }
      };

      if (exitResult instanceof Promise) {
        exitResult.then(reset).catch(console.error);
      } else {
        reset();
      }
    }
  }

  public pause(): void {
    const active = this.current();
    if (active) active.onPause();
  }

  public resume(): void {
    const active = this.current();
    if (active) active.onResume();
  }
}

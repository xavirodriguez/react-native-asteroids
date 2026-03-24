import { Entity } from "../../types/EngineTypes";
import { World } from "../World";

/**
 * Scene Interface: Point of composition for systems and entities.
 */
export interface Scene {
  id: string;
  onEnter: (world: World) => void;
  onExit: (world: World) => void;
  onPause?: (world: World) => void;
  onResume?: (world: World) => void;
  update: (world: World, deltaTime: number) => void;
}

/**
 * SceneManager for lifecycle and state transitions.
 */
export class SceneManager {
  private scenes = new Map<string, Scene>();
  private activeSceneId: string | null = null;
  private isPaused = false;

  constructor(private world: World) {}

  registerScene(scene: Scene): void {
    this.scenes.set(scene.id, scene);
  }

  loadScene(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene '${sceneId}' not registered`);

    if (this.activeSceneId) {
      this.scenes.get(this.activeSceneId)?.onExit(this.world);
      this.world.clear();
    }

    this.activeSceneId = sceneId;
    scene.onEnter(this.world);
  }

  switchScene(nextSceneId: string): void {
    this.loadScene(nextSceneId);
  }

  pause(): void {
    if (this.activeSceneId && !this.isPaused) {
      this.isPaused = true;
      this.scenes.get(this.activeSceneId)?.onPause?.(this.world);
    }
  }

  resume(): void {
    if (this.activeSceneId && this.isPaused) {
      this.isPaused = false;
      this.scenes.get(this.activeSceneId)?.onResume?.(this.world);
    }
  }

  update(deltaTime: number): void {
    if (this.isPaused || !this.activeSceneId) return;
    const scene = this.scenes.get(this.activeSceneId);
    scene?.update(this.world, deltaTime);
    this.world.update(deltaTime);
  }

  getActiveSceneId(): string | null {
    return this.activeSceneId;
  }
}

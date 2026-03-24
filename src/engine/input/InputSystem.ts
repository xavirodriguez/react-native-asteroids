import { GameInputEvent, InputEventType } from "../core/types/SystemTypes";
import { CameraSystem } from "../camera/CameraSystem";

/**
 * InputSystem: Manages raw input events from the UI and converts them to gameplay events.
 */
export class InputSystem {
  private eventQueue: GameInputEvent[] = [];

  constructor(private cameraSystem: CameraSystem) {}

  /**
   * Enqueue a new raw touch event.
   */
  enqueueEvent(type: InputEventType, screenPosition: { x: number; y: number }, options: any = {}): void {
    const worldPosition = this.cameraSystem.screenToWorld(screenPosition);
    const event: GameInputEvent = {
      type,
      screenPosition,
      worldPosition,
      ...options,
    };
    this.eventQueue.push(event);
  }

  /**
   * Process and consume all queued events in the current frame.
   */
  processEvents(callback: (event: GameInputEvent) => void): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) callback(event);
    }
  }

  /**
   * Clear the event queue (useful on scene changes).
   */
  clear(): void {
    this.eventQueue = [];
  }

  /**
   * World Picking: Detects an entity at a given world position based on AABB.
   */
  pickEntityAt(world: any, worldPosition: { x: number; y: number }): number | null {
    const entities = world.query("Transform", "Renderable");
    for (const entity of entities) {
      const transform = world.getComponent(entity, "Transform");
      const render = world.getComponent(entity, "Renderable");
      if (transform && render) {
        const halfW = render.size.width / 2;
        const halfH = render.size.height / 2;
        if (
          worldPosition.x >= transform.x - halfW &&
          worldPosition.x <= transform.x + halfW &&
          worldPosition.y >= transform.y - halfH &&
          worldPosition.y <= transform.y + halfH
        ) {
          return entity;
        }
      }
    }
    return null;
  }
}

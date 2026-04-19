import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { InputBufferComponent } from "../types/InputBufferComponent";

export class InputBufferSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("InputBuffer");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const buffer = world.getComponent<InputBufferComponent>(entity, "InputBuffer");
      if (buffer && buffer.bufferTimer > 0) {
        buffer.bufferTimer -= deltaTime;
        if (buffer.bufferTimer <= 0) {
          buffer.bufferedAction = null;
        }
      }
    }
  }

  public static buffer(world: World, entity: Entity, action: string, duration?: number): void {
    const buffer = world.getComponent<InputBufferComponent>(entity, "InputBuffer");
    if (buffer) {
      buffer.bufferedAction = action;
      buffer.bufferTimer = duration || buffer.bufferDuration;
    }
  }

  public static consume(world: World, entity: Entity, action: string): boolean {
    const buffer = world.getComponent<InputBufferComponent>(entity, "InputBuffer");
    if (buffer && buffer.bufferedAction === action) {
      buffer.bufferedAction = null;
      buffer.bufferTimer = 0;
      return true;
    }
    return false;
  }
}

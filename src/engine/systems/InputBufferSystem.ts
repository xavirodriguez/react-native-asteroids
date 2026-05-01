/**
 * System that manages short-term storage of user inputs.
 *
 * This system allows actions to be "buffered" for a short period, enabling features
 * like jump buffering or coyote time. It decrements timers and clears expired actions.
 *
 * @packageDocumentation
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { InputBufferComponent } from "../types/InputBufferComponent";

/**
 * Manages the lifecycle of buffered input actions.
 */
export class InputBufferSystem extends System {
  /**
   * Updates buffer timers for all entities.
   */
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

  /**
   * Records an action in the entity's input buffer.
   * @param world - ECS World.
   * @param entity - Target entity.
   * @param action - Semantic name of the action.
   * @param duration - Optional override for how long the action remains valid (ms).
   */
  public static buffer(world: World, entity: Entity, action: string, duration?: number): void {
    const buffer = world.getComponent<InputBufferComponent>(entity, "InputBuffer");
    if (buffer) {
      buffer.bufferedAction = action;
      buffer.bufferTimer = duration || buffer.bufferDuration;
    }
  }

  /**
   * Checks if an action is buffered and removes it if found.
   * @returns True if the action was successfully consumed.
   */
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

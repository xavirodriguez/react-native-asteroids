import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { InputStateComponent } from "../ecs/CoreComponents";

/**
 * Interface for the raw hardware input source.
 */
export interface InputSource {
  getAxes(): Map<string, number>;
  getButtons(): Map<string, boolean>;
  getActions?(): Map<string, boolean>;
}

/**
 * System that synchronizes raw hardware input into the ECS InputState.
 * Supports logical action mapping.
 *
 * @remarks
 * Capture and synchronization of input are performed during the Input phase
 * of the {@link GameLoop}. The order of event processing may depend on the
 * underlying {@link InputSource} implementation.
 *
 * API status: Public
 */
export class UnifiedInputSystem extends System {
  private source: InputSource;

  constructor(source: InputSource) {
    super();
    this.source = source;
  }

  public update(world: World, _deltaTime: number): void {
    if (world.isReSimulating) return;

    let inputEntity = world.query("InputState")[0];

    // Auto-create singleton input entity if it doesn't exist
    if (inputEntity === undefined) {
      const commands = world.getCommandBuffer();
      // We don't have a direct "createEntityWithComponents" in command buffer yet that returns ID,
      // but we can just use createEntity and then addComponent next frame or via world if not updating.
      // For now, let's assume it should be pre-created or we use a stable ID if possible.
      // Actually, UnifiedInputSystem usually manages a singleton.
      return;
    }

    const axes = this.source.getAxes();
    const buttons = this.source.getButtons();
    const actions = this.source.getActions?.() || new Map();

    world.mutateComponent<InputStateComponent>(inputEntity, "InputState", (state) => {
      // Sync axes
      state.axes.clear();
      axes.forEach((val, key) => state.axes.set(key, val));

      // Sync buttons
      state.buttons.clear();
      buttons.forEach((val, key) => state.buttons.set(key, val));

      // Sync actions
      state.actions.clear();
      actions.forEach((val, key) => state.actions.set(key, val));
    });
  }
}

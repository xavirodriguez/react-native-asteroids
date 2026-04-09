import { InputStateComponent, InputAction, TilemapComponent } from "../core/CoreComponents";

/**
 * Utility functions for interacting with components as pure data.
 */

export const InputUtils = {
  /**
   * Checks if a semantic action is currently pressed.
   */
  isPressed(inputState: InputStateComponent, action: InputAction): boolean {
    return inputState.actions.get(action) || false;
  },

  /**
   * Gets the value of a specific axis.
   */
  getAxis(inputState: InputStateComponent, axis: string): number {
    return inputState.axes.get(axis) || 0;
  }
};

export const TilemapUtils = {
  /**
   * Checks if a tile at the given coordinates is solid.
   */
  isSolid(tilemap: TilemapComponent, tileX: number, tileY: number): boolean {
    const { data } = tilemap;
    if (tileX < 0 || tileX >= data.width || tileY < 0 || tileY >= data.height) {
      return true; // Out of bounds is solid
    }

    for (const layer of data.layers) {
      if (!layer.collidable) continue;
      const tileId = layer.tiles[tileY * data.width + tileX];
      const tileset = data.tilesets.find(ts => ts.id === tileId);
      if (tileset?.solid) return true;
      if (!tileset && tileId > 0) return true; // Default to solid if ID > 0 and no specific config
    }
    return false;
  }
};

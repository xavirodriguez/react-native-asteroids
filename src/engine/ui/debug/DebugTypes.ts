/**
 * @packageDocumentation
 * Configuration types for the debug system.
 */

import { Component } from "../../core/Component";

/**
 * Singleton component that controls the visibility of debug overlays.
 *
 * @responsibility Provide global flags to enable/disable technical visualization layers.
 */
export interface DebugConfigComponent extends Component {
  type: "DebugConfig";
  /** If true, draws green wireframes over physical colliders. */
  showColliders: boolean;
  /** If true, draws cyan vectors representing entity velocity. */
  showVelocities: boolean;
  /** If true, renders entity ID numbers above their positions. */
  showEntityIds: boolean;
  /** If true, displays a real-time FPS counter in the corner. */
  showFPS: boolean;
}

/**
 * Configuration for virtual joystick behavior and response curves.
 */
export interface JoystickConfig {
  /** [unitless] Normalized radial deadzone radius [0, 1]. */
  deadzone: number;
  /** Response curve algorithm to apply to the input. */
  curveType: "linear" | "quadratic" | "squared";
  /** [unitless] Exponent for the quadratic curve (recommended: 1.8). */
  curveExponent: number;
  /** [unitless] Global input sensitivity multiplier. */
  sensitivity: number;
  /** Whether to normalize the final output vector (clamped to unit circle). */
  normalizeOutput: boolean;
}

/**
 * Semantic purpose of the joystick, used for automatic command generation.
 */
export type JoystickType = "movement" | "rotation" | "generic";

/**
 * Default configuration for a standard joystick.
 */
export const DEFAULT_JOYSTICK_CONFIG: JoystickConfig = {
  deadzone: 0.15,
  curveType: "quadratic",
  curveExponent: 1.8,
  sensitivity: 1.0,
  normalizeOutput: true,
};

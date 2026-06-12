/**
 * Interface for haptic feedback providers.
 * Allows the core to trigger haptics without depending on platform-specific APIs.
 */
export interface HapticsProvider {
  hapticShoot(): void;
  hapticDamage(): void;
  hapticDeath(): void;
  hapticHyperspace(): void;
  hapticThrust(active: boolean): void;
}

/**
 * A no-op haptics provider for environments that don't support it (e.g., server, tests).
 */
export const noopHapticsProvider: HapticsProvider = {
  hapticShoot: () => {},
  hapticDamage: () => {},
  hapticDeath: () => {},
  hapticHyperspace: () => {},
  hapticThrust: () => {},
};

import { useEffect } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

/**
 * Hook to manage keep-awake state in a symmetric and encapsulated way.
 *
 * Principle 4: Symmetric Resource Acquisition/Release
 * Encapsulates the activation and deactivation of keep-awake within a useEffect cleanup.
 *
 * @param enabled - Whether the device should stay awake.
 */
export function useKeepAwake(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    // Symmetric activation
    activateKeepAwakeAsync().catch((error) => {
      // Common on web or if already deactivated
      console.warn("Could not activate keep-awake:", error);
    });

    return () => {
      // Symmetric deactivation
      try {
        deactivateKeepAwake();
      } catch (error) {
        // Wrap in try-catch to prevent errors on web during rapid transitions
        console.warn("Error deactivating keep-awake:", error);
      }
    };
  }, [enabled]);
}

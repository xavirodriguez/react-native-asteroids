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
    // Check if we are in a browser and if wakeLock is supported (non-secure contexts often lack it)
    const isWeb = typeof document !== "undefined" && typeof document.createElement === "function";
    const supportsWakeLock = isWeb && "wakeLock" in navigator;

    if (!enabled) return;

    // Only skip activation on web without WakeLock support; native is handled by Expo
    if (isWeb && !supportsWakeLock) {
      // Silently fail on web without support to avoid console noise in dev
      return;
    }

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

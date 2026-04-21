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
/**
 * Interface extension for Navigator to include experimental WakeLock API.
 */
interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: any;
}

export function useKeepAwake(enabled: boolean = true): void {
  useEffect(() => {
    // Improved platform detection for Web environment
    const isWeb = typeof window !== "undefined" && typeof navigator !== "undefined";
    const nav = (typeof navigator !== "undefined" ? navigator : undefined) as NavigatorWithWakeLock | undefined;


    // WakeLock is only available in secure contexts (HTTPS) and supported browsers
    const supportsWakeLock = !!(isWeb &&
      nav &&
      'wakeLock' in nav &&
      nav.wakeLock);

    if (!enabled) return;

    // On web, if WakeLock is not supported, we don't even try to call Expo's API
    // as it might attempt to access navigator.wakeLock and throw.
    if (isWeb && !supportsWakeLock) {
      return;
    }

    // Symmetric activation with extra safety
    try {
      activateKeepAwakeAsync().catch((error: Error) => {
        // Common on web if not in secure context or if already deactivated
        // We log as info to avoid cluttering error logs for a non-critical failure
        const message = error instanceof Error ? error.message : String(error);
        console.info("Keep-awake activation skipped or failed:", message);
      });
    } catch (_e) {
      // Catch synchronous errors if any
      console.info("Keep-awake not supported in this environment");
    }

    return () => {
      // Symmetric deactivation
      try {
        if (!isWeb || supportsWakeLock) {
          deactivateKeepAwake();
        }
      } catch (_error) {
        // Silently fail on cleanup to prevent crash during unmount
      }
    };
  }, [enabled]);
}

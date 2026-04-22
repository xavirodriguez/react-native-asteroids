import { useEffect } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

/**
 * Hook to attempt keeping the screen active in a symmetric and encapsulated way.
 *
 * @remarks
 * Implements the Resource acquisition/release principle. On the Web platform,
 * it depends on the availability of the WakeLock API and a secure context (HTTPS).
 *
 * @param enabled - Whether to request keeping the device active.
 */
/**
 * Interface extension for Navigator to include experimental WakeLock API.
 */
interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: "screen"): Promise<unknown>;
  };
}

export function useKeepAwake(enabled: boolean = true): void {
  useEffect(() => {
    // Improved platform detection for Web environment
    const isWeb = typeof window !== "undefined" && typeof navigator !== "undefined";
    const nav = (typeof navigator !== "undefined" ? navigator : undefined) as NavigatorWithWakeLock | undefined;


    // WakeLock is only available in secure contexts (HTTPS) and supported browsers
    const supportsWakeLock = isWeb &&
      'wakeLock' in nav &&
      nav.wakeLock !== undefined &&
      nav.wakeLock !== null;

    if (!enabled) return;

    // On the Web platform, if WakeLock is not supported, execution is aborted
    // to avoid potential exceptions in non-secure contexts.
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

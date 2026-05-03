import { useState, useEffect } from "react";
import { Platform } from "react-native";

/**
 * Hook to detect if the current device is a touch device.
 *
 * @returns true if the device is touch-enabled, false otherwise.
 *
 * @remarks
 * - On native platforms (iOS/Android), it always returns true.
 * - On web, it uses the `(pointer: coarse)` media query to detect touch capability.
 * - Handles SSR by returning false if `window` is not defined.
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (Platform.OS !== "web") {
      return true;
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(pointer: coarse)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)");

    // Initial check in case it changed between initialization and effect
    setIsTouch(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsTouch(event.matches);
    };

    // Modern browsers support addEventListener on MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return isTouch;
}

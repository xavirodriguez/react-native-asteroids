import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Trigger a light impact haptic feedback when shooting.
 */
export function hapticShoot(): void {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Trigger a warning notification haptic feedback when taking damage.
 */
export function hapticDamage(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Trigger an error notification haptic feedback when the player dies.
 */
export function hapticDeath(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Trigger a heavy impact haptic feedback for hyperspace.
 */
export function hapticHyperspace(): void {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * Trigger continuous low-intensity feedback for thrust.
 */
export function hapticThrust(active: boolean): void {
  if (Platform.OS === "web") return;
  if (active) {
    // Note: Expo Haptics doesn't have a native "loop" or "continuous" mode,
    // but we can trigger light impacts. Continuous feedback usually requires
    // higher-level native control, but we'll use a light impact for start.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

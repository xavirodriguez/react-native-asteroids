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

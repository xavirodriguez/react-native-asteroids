import { StyleSheet, Pressable, Text } from "react-native";

export interface ShootButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Pure UI component for shooting.
 * Circular button, 72x72px, semi-transparent red tint.
 * Uses Pressable for visual feedback and touch handling.
 */
export function ShootButton({ onPressIn, onPressOut }: ShootButtonProps) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? "rgba(255, 80, 80, 0.7)"
            : "rgba(255, 80, 80, 0.4)",
        },
      ]}
    >
      <Text style={styles.label}>FIRE</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(255, 80, 80, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FF8080",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});

import { StyleSheet, Pressable, Text } from "react-native";

export interface HyperspaceButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Pure UI component for Hyperspace action.
 * Smaller than ShootButton, semi-transparent cyan tint.
 */
export function HyperspaceButton({ onPressIn, onPressOut }: HyperspaceButtonProps) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? "rgba(0, 255, 255, 0.7)"
            : "rgba(0, 255, 255, 0.3)",
        },
      ]}
    >
        <Text style={styles.label}>H</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "cyan",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
  }
});

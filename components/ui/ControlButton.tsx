import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";

interface ControlButtonProps {
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

/**
 * Atomic component for on-screen game controls.
 */
export const ControlButton: React.FC<ControlButtonProps> = ({
  label,
  onPressIn,
  onPressOut,
  style,
  labelStyle,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.6}
    >
      <Text style={[styles.text, labelStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});

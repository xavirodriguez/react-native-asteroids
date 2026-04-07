import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";

interface FlappyBirdControlsProps {
  onFlap: (pressed: boolean) => void;
}

export const FlappyBirdControls: React.FC<FlappyBirdControlsProps> = ({
  onFlap,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.flapButton}
        onPressIn={() => onFlap(true)}
        onPressOut={() => onFlap(false)}
      >
        <Text style={styles.buttonText}>FLAP</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  flapButton: {
    width: '100%',
    height: '100%',
    backgroundColor: "transparent",
  },
  buttonText: {
    display: 'none',
  },
});

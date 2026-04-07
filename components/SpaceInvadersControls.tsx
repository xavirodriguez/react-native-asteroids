import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";

interface SpaceInvadersControlsProps {
  onMoveLeft: (pressed: boolean) => void;
  onMoveRight: (pressed: boolean) => void;
  onShoot: (pressed: boolean) => void;
}

export const SpaceInvadersControls: React.FC<SpaceInvadersControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onShoot,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.movementControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPressIn={() => onMoveLeft(true)}
          onPressOut={() => onMoveLeft(false)}
        >
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPressIn={() => onMoveRight(true)}
          onPressOut={() => onMoveRight(false)}
        >
          <Text style={styles.buttonText}>→</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.controlButton, styles.shootButton]}
        onPressIn={() => onShoot(true)}
        onPressOut={() => onShoot(false)}
      >
        <Text style={styles.buttonText}>SHOOT</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    alignItems: "center",
  },
  movementControls: {
    flexDirection: "row",
    gap: 20,
  },
  controlButton: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  shootButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 255, 0, 0.3)",
    borderColor: "rgba(0, 255, 0, 0.5)",
  },
  buttonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
});

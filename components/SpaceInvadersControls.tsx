import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useTouchDevice } from "../src/hooks/useTouchDevice";
import { ControlButton } from "./ui/ControlButton";

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
  const isTouch = useTouchDevice();

  if (!isTouch) {
    return (
      <View style={styles.webInstructions}>
        <Text style={styles.instructionText}>Use Arrow Keys to move, Space to shoot</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.movementControls}>
        <ControlButton
          label="←"
          style={styles.controlButton}
          labelStyle={styles.buttonText}
          onPressIn={() => onMoveLeft(true)}
          onPressOut={() => onMoveLeft(false)}
        />
        <ControlButton
          label="→"
          style={styles.controlButton}
          labelStyle={styles.buttonText}
          onPressIn={() => onMoveRight(true)}
          onPressOut={() => onMoveRight(false)}
        />
      </View>
      <ControlButton
        label="SHOOT"
        style={[styles.controlButton, styles.shootButton]}
        labelStyle={styles.buttonText}
        onPressIn={() => onShoot(true)}
        onPressOut={() => onShoot(false)}
      />
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
  webInstructions: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "monospace",
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

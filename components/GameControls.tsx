import type React from "react"
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native"

/**
 * Properties for the {@link GameControls} component.
 */
interface GameControlsProps {
  /** Callback triggered when the thrust control state changes. */
  onThrust: (pressed: boolean) => void
  /** Callback triggered when the rotate left control state changes. */
  onRotateLeft: (pressed: boolean) => void
  /** Callback triggered when the rotate right control state changes. */
  onRotateRight: (pressed: boolean) => void
  /** Callback triggered when the shoot control state changes. */
  onShoot: (pressed: boolean) => void
}

/**
 * Overlay component providing on-screen controls for mobile or instructions for web.
 *
 * @param props - Component properties.
 * @returns A React functional component.
 *
 * @remarks
 * This component adaptively renders:
 * - **On Web**: A simple instruction text explaining keyboard controls.
 * - **On Mobile/Native**: Touch-sensitive buttons for rotation, thrust, and shooting.
 *
 * @example
 * ```tsx
 * <GameControls
 *   onThrust={(pressed) => handleThrust(pressed)}
 *   onShoot={() => fireBullet()}
 *   // ... other props
 * />
 * ```
 */
export const GameControls: React.FC<GameControlsProps> = ({ onThrust, onRotateLeft, onRotateRight, onShoot }) => {
  // Only show touch controls on native platforms
  if (Platform.OS === "web") {
    return (
      <View style={styles.webInstructions}>
        <Text style={styles.instructionText}>Use Arrow Keys to move, Space to shoot</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.leftControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPressIn={() => onRotateLeft(true)}
          onPressOut={() => onRotateLeft(false)}
        >
          <Text style={styles.buttonText}>↺</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPressIn={() => onThrust(true)}
          onPressOut={() => onThrust(false)}
        >
          <Text style={styles.buttonText}>↑</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPressIn={() => onRotateRight(true)}
          onPressOut={() => onRotateRight(false)}
        >
          <Text style={styles.buttonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightControls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.shootButton]}
          onPressIn={() => onShoot(true)}
          onPressOut={() => onShoot(false)}
        >
          <Text style={styles.buttonText}>FIRE</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
  leftControls: {
    flexDirection: "row",
    gap: 10,
  },
  rightControls: {
    justifyContent: "center",
  },
  controlButton: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  shootButton: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: "rgba(255, 0, 0, 0.3)",
    borderColor: "#FF0000",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
})

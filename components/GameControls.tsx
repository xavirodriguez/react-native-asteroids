import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTouchDevice } from "../src/hooks/useTouchDevice"
import { ControlButton } from "./ui/ControlButton"

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
  /** Callback triggered when the hyperspace control state changes. */
  onHyperspace: (pressed: boolean) => void
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
export const GameControls = React.memo(function GameControls({
  onThrust,
  onRotateLeft,
  onRotateRight,
  onShoot,
  onHyperspace,
}: GameControlsProps) {
  const isTouch = useTouchDevice()

  if (!isTouch) {
    return (
      <View style={styles.webInstructions}>
        <Text style={styles.instructionText}>Use Arrow Keys to move, Space to shoot, Shift to Hyperspace</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.leftControls}>
        <ControlButton
          label="↺"
          onPressIn={() => onRotateLeft(true)}
          onPressOut={() => onRotateLeft(false)}
        />

        <ControlButton
          label="↑"
          onPressIn={() => onThrust(true)}
          onPressOut={() => onThrust(false)}
        />

        <ControlButton
          label="↻"
          onPressIn={() => onRotateRight(true)}
          onPressOut={() => onRotateRight(false)}
        />
      </View>

      <View style={styles.rightControls}>
        <ControlButton
          label="H"
          style={styles.hyperspaceButton}
          onPressIn={() => onHyperspace(true)}
          onPressOut={() => onHyperspace(false)}
        />

        <ControlButton
          label="FIRE"
          style={styles.shootButton}
          onPressIn={() => onShoot(true)}
          onPressOut={() => onShoot(false)}
        />
      </View>
    </View>
  )
})

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
  shootButton: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: "rgba(255, 0, 0, 0.3)",
    borderColor: "#FF0000",
  },
  hyperspaceButton: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(0, 255, 255, 0.3)",
    borderColor: "#00FFFF",
    marginRight: 10,
  },
})

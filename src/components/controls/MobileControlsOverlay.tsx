import { useCallback, useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { VirtualJoystick } from "./VirtualJoystick";
import { ActionButton } from "./ActionButton";
import type { MobileInputAdapter } from "../../engine/input/MobileInputAdapter";

export interface MobileControlsOverlayProps {
  adapter: MobileInputAdapter;
  /**
   * Asteroids mapping:
   *   joystick x < -0.35 → rotateLeft
   *   joystick x >  0.35 → rotateRight
   *   joystick y < -0.25 → thrust
   *
   * Set to false to use raw axis mode (adapter.setMoveAxis).
   */
  discreteMapping?: boolean;
}

const ROTATE_THRESHOLD = 0.35;
const THRUST_THRESHOLD = -0.25; // negative Y = up on screen

/**
 * Renders touch controls on top of the game canvas.
 * Only mounts on iOS/Android. Cleans up all overrides on unmount.
 */
export function MobileControlsOverlay({
  adapter,
  discreteMapping = true,
}: MobileControlsOverlayProps) {
  // Don't render on web
  if (Platform.OS === "web") return null;

  return <MobileControlsOverlayInner adapter={adapter} discreteMapping={discreteMapping} />;
}

// Inner component so hooks are only called on native
function MobileControlsOverlayInner({
  adapter,
  discreteMapping,
}: MobileControlsOverlayProps) {
  // Keep a stable ref to avoid stale closures in gesture callbacks
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  // Clean up all overrides when the overlay unmounts
  useEffect(() => {
    return () => {
      adapterRef.current.reset();
    };
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    const a = adapterRef.current;
    if (discreteMapping) {
      a.setRotateLeft(x < -ROTATE_THRESHOLD);
      a.setRotateRight(x > ROTATE_THRESHOLD);
      a.setThrust(y < THRUST_THRESHOLD);
    } else {
      a.setMoveAxis(x, y);
    }
  }, [discreteMapping]);

  const handleJoystickRelease = useCallback(() => {
    const a = adapterRef.current;
    if (discreteMapping) {
      a.setRotateLeft(false);
      a.setRotateRight(false);
      a.setThrust(false);
    } else {
      a.setMoveAxis(0, 0);
    }
  }, [discreteMapping]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Left zone — joystick */}
      <View style={styles.leftZone}>
        <VirtualJoystick
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
        />
      </View>

      {/* Right zone — action buttons */}
      <View style={styles.rightZone}>
        <ActionButton
          label="🔥"
          onPressIn={() => adapterRef.current.setShoot(true)}
          onPressOut={() => adapterRef.current.setShoot(false)}
          color="rgba(255,80,80,0.25)"
        />
        <ActionButton
          label="⚡"
          onPressIn={() => adapterRef.current.setHyperspace(true)}
          onPressOut={() => adapterRef.current.setHyperspace(false)}
          color="rgba(80,80,255,0.25)"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  leftZone: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightZone: {
    gap: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    flexDirection: "column",
  },
});

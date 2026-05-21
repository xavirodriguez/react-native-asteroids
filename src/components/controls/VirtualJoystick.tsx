import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const BASE_RADIUS = 60;   // px — radio del área base
const KNOB_RADIUS = 24;   // px — radio del knob
const MAX_OFFSET = BASE_RADIUS - KNOB_RADIUS;

export interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  onRelease: () => void;
}

/**
 * Pure UI component. Knows nothing about ECS or game logic.
 * Communicates exclusively via onMove / onRelease callbacks.
 */
export function VirtualJoystick({ onMove, onRelease }: VirtualJoystickProps) {
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  const handleMove = useCallback(
    (x: number, y: number) => onMove(x, y),
    [onMove]
  );
  const handleRelease = useCallback(() => onRelease(), [onRelease]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onUpdate((e) => {
      // Clamp to circle
      const dist = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
      const clamp = Math.min(dist, MAX_OFFSET);
      const angle = Math.atan2(e.translationY, e.translationX);

      knobX.value = clamp * Math.cos(angle);
      knobY.value = clamp * Math.sin(angle);

      // Normalize to [-1, 1]
      const nx = knobX.value / MAX_OFFSET;
      const ny = knobY.value / MAX_OFFSET;
      runOnJS(handleMove)(nx, ny);
    })
    .onEnd(() => {
      knobX.value = withSpring(0, { damping: 20, stiffness: 300 });
      knobY.value = withSpring(0, { damping: 20, stiffness: 300 });
      runOnJS(handleRelease)();
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: knobX.value },
      { translateY: knobY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.base}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    width: BASE_RADIUS * 2,
    height: BASE_RADIUS * 2,
    borderRadius: BASE_RADIUS,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: KNOB_RADIUS * 2,
    height: KNOB_RADIUS * 2,
    borderRadius: KNOB_RADIUS,
    backgroundColor: "rgba(255,255,255,0.7)",
    position: "absolute",
  },
});

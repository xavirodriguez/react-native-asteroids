import { useCallback } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Enhanced Virtual Joystick.
 * Supports "floating" behavior: appears where the user touches.
 * Communicates exclusively via onMove / onRelease callbacks.
 */
export function VirtualJoystick({ onMove, onRelease, containerStyle }: VirtualJoystickProps) {
  const isVisible = useSharedValue(false);
  const basePos = useSharedValue({ x: 0, y: 0 });
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  const handleMove = useCallback(
    (x: number, y: number) => onMove(x, y),
    [onMove]
  );
  const handleRelease = useCallback(() => onRelease(), [onRelease]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      isVisible.value = true;
      basePos.value = { x: e.x, y: e.y };
      knobX.value = 0;
      knobY.value = 0;
    })
    .onUpdate((e) => {
      const dx = e.x - basePos.value.x;
      const dy = e.y - basePos.value.y;

      // Clamp to circle
      const dist = Math.sqrt(dx ** 2 + dy ** 2);
      const clamp = Math.min(dist, MAX_OFFSET);
      const angle = Math.atan2(dy, dx);

      knobX.value = clamp * Math.cos(angle);
      knobY.value = clamp * Math.sin(angle);

      // Normalize to [-1, 1] with deadzone
      const deadzone = 0.1;
      let nx = knobX.value / MAX_OFFSET;
      let ny = knobY.value / MAX_OFFSET;

      if (Math.abs(nx) < deadzone) nx = 0;
      if (Math.abs(ny) < deadzone) ny = 0;

      runOnJS(handleMove)(nx, ny);
    })
    .onEnd(() => {
      knobX.value = withSpring(0, { damping: 20, stiffness: 300 });
      knobY.value = withSpring(0, { damping: 20, stiffness: 300 });
      isVisible.value = false;
      runOnJS(handleRelease)();
    });

  const baseStyle = useAnimatedStyle(() => ({
    opacity: isVisible.value ? 1 : 0,
    transform: [
      { translateX: basePos.value.x - BASE_RADIUS },
      { translateY: basePos.value.y - BASE_RADIUS },
    ],
    position: "absolute",
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: knobX.value },
      { translateY: knobY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.container, containerStyle]}>
        <Animated.View style={[styles.base, baseStyle]}>
          <Animated.View style={[styles.knob, knobStyle]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
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

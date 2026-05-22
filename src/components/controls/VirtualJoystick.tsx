import { useCallback, useEffect, useRef } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { World } from "@/engine/core/World";
import { Entity } from "@/engine/core/Entity";
import { VirtualJoystickComponent } from "@/engine/core/CoreComponents";

const BASE_RADIUS = 60;   // px — radio del área base
const KNOB_RADIUS = 24;   // px — radio del knob
const MAX_OFFSET = BASE_RADIUS - KNOB_RADIUS;

export interface VirtualJoystickProps {
  /** Optional legacy callback for movement. */
  onMove?: (x: number, y: number) => void;
  /** Optional legacy callback for release. */
  onRelease?: () => void;
  /** The ECS World to integrate with. */
  world?: World;
  /** Configuration for the joystick in the ECS. */
  config?: {
    horizontalAxis?: string;
    verticalAxis?: string;
    deadzone?: number;
    sensitivity?: number;
    curveType?: "linear" | "squared";
  };
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Enhanced Virtual Joystick.
 * Supports "floating" behavior: appears where the user touches.
 *
 * It creates and manages an ECS entity with a VirtualJoystickComponent,
 * providing a bridge between the touch UI and the engine systems.
 */
export function VirtualJoystick({
  onMove,
  onRelease,
  world,
  config,
  containerStyle
}: VirtualJoystickProps) {
  const isVisible = useSharedValue(false);
  const basePos = useSharedValue({ x: 0, y: 0 });
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  const entityRef = useRef<Entity | null>(null);

  // Sync with ECS
  useEffect(() => {
    if (!world) return;

    const entity = world.reserveEntityId();
    world.getCommandBuffer().createEntity(entity);
    world.getCommandBuffer().addComponent(entity, {
      type: "VirtualJoystick",
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
      radius: MAX_OFFSET,
      deadzone: config?.deadzone ?? 0.15,
      sensitivity: config?.sensitivity ?? 1.0,
      curveType: config?.curveType ?? "squared",
      horizontalAxis: config?.horizontalAxis ?? "horizontal",
      verticalAxis: config?.verticalAxis ?? "vertical",
    } as VirtualJoystickComponent);

    entityRef.current = entity;
    // Flush to make entity available immediately
    world.flush();

    return () => {
      if (entityRef.current !== null) {
        world.getCommandBuffer().removeEntity(entityRef.current);
        world.flush();
        entityRef.current = null;
      }
    };
  }, [world, config]);

  const handleMove = useCallback(
    (x: number, y: number) => onMove?.(x, y),
    [onMove]
  );
  const handleRelease = useCallback(() => onRelease?.(), [onRelease]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      isVisible.value = true;
      basePos.value = { x: e.x, y: e.y };
      knobX.value = 0;
      knobY.value = 0;

      if (world && entityRef.current !== null) {
        const entity = entityRef.current;
        const joystick = world.getMutableComponent<VirtualJoystickComponent>(entity, "VirtualJoystick");
        if (joystick) {
          joystick.active = true;
          joystick.originX = e.x;
          joystick.originY = e.y;
          joystick.currentX = e.x;
          joystick.currentY = e.y;
        }
      }
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

      if (world && entityRef.current !== null) {
        const entity = entityRef.current;
        const joystick = world.getMutableComponent<VirtualJoystickComponent>(entity, "VirtualJoystick");
        if (joystick) {
          joystick.currentX = e.x;
          joystick.currentY = e.y;
        }
      }

      // Legacy fallback
      if (onMove) {
        const deadzone = 0.1;
        let nx = knobX.value / MAX_OFFSET;
        let ny = knobY.value / MAX_OFFSET;

        if (Math.abs(nx) < deadzone) nx = 0;
        if (Math.abs(ny) < deadzone) ny = 0;

        runOnJS(handleMove)(nx, ny);
      }
    })
    .onEnd(() => {
      knobX.value = withSpring(0, { damping: 20, stiffness: 300 });
      knobY.value = withSpring(0, { damping: 20, stiffness: 300 });
      isVisible.value = false;

      if (world && entityRef.current !== null) {
        const entity = entityRef.current;
        const joystick = world.getMutableComponent<VirtualJoystickComponent>(entity, "VirtualJoystick");
        if (joystick) {
          joystick.active = false;
        }
      }

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

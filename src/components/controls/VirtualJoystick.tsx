import { useEffect, useRef } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { World } from "@tiny-aster/core";
import { Entity } from "@tiny-aster/core";
import { VirtualJoystickComponent, TagComponent } from "@tiny-aster/core";
import { JoystickType } from "@tiny-aster/core";

export interface VirtualJoystickProps {
  /** Unique ID for identifying the ECS entity. */
  joystickId: string;
  /** Semantic purpose of the joystick. */
  type: JoystickType;
  /** Radius of the joystick base (default: 60). */
  size?: number;
  /** Radius of the knob (default: 24). */
  knobSize?: number;
  /** Base color of the joystick elements. */
  color?: string;
  /** Color when active. */
  activeColor?: string;
  /** Base opacity of the joystick. */
  opacity?: number;
  /** Whether to show the background ring. */
  showBackgroundRing?: boolean;
  /** The ECS World to integrate with. */
  world?: World;
  /** Optional style for the touchable container. */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Enhanced Virtual Joystick (Phase 3).
 *
 * Features:
 * - Floating Dynamic behavior (appears on touch).
 * - Reanimated 3 for smooth, decoupled knob movement.
 * - Direct ECS integration via world.getMutableComponent.
 */
export function VirtualJoystick({
  joystickId,
  type,
  size = 75,
  knobSize = 30,
  color = "rgba(255,255,255,0.3)",
  activeColor = "rgba(255,255,255,0.7)",
  opacity = 0.6,
  showBackgroundRing = true,
  world,
  containerStyle,
}: VirtualJoystickProps) {
  const BASE_RADIUS = size;
  const KNOB_RADIUS = knobSize;
  const MAX_OFFSET = BASE_RADIUS - KNOB_RADIUS;

  const isVisible = useSharedValue(false);
  const visualOpacity = useSharedValue(0);
  const basePos = useSharedValue({ x: 0, y: 0 });
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  const entityRef = useRef<Entity | null>(null);

  // Sync with ECS Entity Lifecycle
  useEffect(() => {
    if (!world) return;

    const entity = world.reserveEntityId();
    world.getCommandBuffer().createEntity(entity);
    world.getCommandBuffer().addComponent(entity, {
      type: "Tag",
      tags: [joystickId]
    } as TagComponent);
    world.getCommandBuffer().addComponent(entity, {
      type: "VirtualJoystick",
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
      radius: MAX_OFFSET,
      joystickType: type,
      // Default axes based on type if not specified
      horizontalAxis: type === "rotation" ? "rotate_horizontal" : "horizontal",
      verticalAxis: type === "rotation" ? "rotate_vertical" : "vertical",
    } as VirtualJoystickComponent);

    entityRef.current = entity;
    world.flush();

    return () => {
      if (entityRef.current !== null) {
        world.getCommandBuffer().removeEntity(entityRef.current);
        world.flush();
        entityRef.current = null;
      }
    };
  }, [world, type, joystickId, MAX_OFFSET]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onStart((e) => {
      isVisible.value = true;
      visualOpacity.value = withTiming(opacity, { duration: 150 });
      basePos.value = { x: e.x, y: e.y };
      knobX.value = 0;
      knobY.value = 0;

      if (world && entityRef.current !== null) {
        const entity = entityRef.current;
        world.getCommandBuffer().mutateComponent<VirtualJoystickComponent>(entity, "VirtualJoystick", joystick => {
          joystick.active = true;
          joystick.originX = e.x;
          joystick.originY = e.y;
          joystick.currentX = e.x;
          joystick.currentY = e.y;
        });
      }
    })
    .onUpdate((e) => {
      const dx = e.x - basePos.value.x;
      const dy = e.y - basePos.value.y;

      // Clamp visual knob to circle
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(dist, MAX_OFFSET);
      const angle = Math.atan2(dy, dx);

      knobX.value = clamp * Math.cos(angle);
      knobY.value = clamp * Math.sin(angle);

      // Write raw absolute coordinates to ECS for simulation
      if (world && entityRef.current !== null) {
        const entity = entityRef.current;
        world.getCommandBuffer().mutateComponent<VirtualJoystickComponent>(entity, "VirtualJoystick", joystick => {
          joystick.currentX = e.x;
          joystick.currentY = e.y;
        });
      }
    })
    .onEnd(() => {
      knobX.value = withSpring(0, { damping: 20, stiffness: 300 });
      knobY.value = withSpring(0, { damping: 20, stiffness: 300 });
      visualOpacity.value = withTiming(0, { duration: 250 }, () => {
        isVisible.value = false;
      });

      if (world && entityRef.current !== null) {
        const entity = entityRef.current;
        world.getCommandBuffer().mutateComponent<VirtualJoystickComponent>(entity, "VirtualJoystick", joystick => {
          joystick.active = false;
        });
      }
    });

  const baseStyle = useAnimatedStyle(() => ({
    opacity: visualOpacity.value,
    transform: [
      { translateX: basePos.value.x - BASE_RADIUS },
      { translateY: basePos.value.y - BASE_RADIUS },
    ],
    display: isVisible.value ? "flex" : "none",
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: knobX.value },
      { translateY: knobY.value },
    ],
    backgroundColor: activeColor,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.container, containerStyle]}>
        <Animated.View
          style={[
            styles.base,
            baseStyle,
            {
              width: BASE_RADIUS * 2,
              height: BASE_RADIUS * 2,
              borderRadius: BASE_RADIUS,
              borderColor: color,
              backgroundColor: showBackgroundRing ? "rgba(255,255,255,0.05)" : "transparent"
            }
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              knobStyle,
              {
                width: KNOB_RADIUS * 2,
                height: KNOB_RADIUS * 2,
                borderRadius: KNOB_RADIUS,
              }
            ]}
          />
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
    position: "absolute",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
  },
});

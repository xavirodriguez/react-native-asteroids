import { SharedValue } from "react-native-reanimated";

/**
 * Camera state for synchronization with UI thread.
 */
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shakeIntensity: number;
}

/**
 * Shared value representation of the camera.
 */
export type SharedCamera = SharedValue<CameraState>;

/**
 * Input event types for the internal queue.
 */
export type InputEventType = "tap" | "drag_start" | "drag_move" | "drag_end" | "swipe" | "hold";

export interface GameInputEvent {
  type: InputEventType;
  screenPosition: { x: number; y: number };
  worldPosition: { x: number; y: number };
  delta?: { x: number; y: number };
  duration?: number;
  direction?: "left" | "right" | "up" | "down";
  targetEntityId?: number;
}


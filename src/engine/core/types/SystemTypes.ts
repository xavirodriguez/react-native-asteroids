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

/**
 * Interface for the Physics Adapter to encapsulate Matter.js.
 */
export interface IPhysicsAdapter {
  update(dt: number): void;
  createBody(entityId: number, config: unknown): unknown;
  removeBody(bodyId: unknown): void;
  applyForce(bodyId: unknown, position: { x: number; y: number }, force: { x: number; y: number }): void;
  applyImpulse(bodyId: unknown, impulse: { x: number; y: number }): void;
  setVelocity(bodyId: unknown, velocity: { x: number; y: number }): void;
  setPosition(bodyId: unknown, position: { x: number; y: number }): void;
  setRotation(bodyId: unknown, angle: number): void;
  getBodyTransform(bodyId: unknown): { x: number; y: number; rotation: number };
}

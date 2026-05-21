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

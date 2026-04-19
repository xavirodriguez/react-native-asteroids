import { ComponentType, ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";

declare module "@shopify/react-native-skia" {
  export interface CanvasProps {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }

  export interface BackdropBlurProps {
    blur: number;
    clip?: { x: number; y: number; width: number; height: number };
    children?: ReactNode;
  }

  export interface FillProps {
    color: string;
  }

  export const Canvas: ComponentType<CanvasProps>;
  export const BackdropBlur: ComponentType<BackdropBlurProps>;
  export const Fill: ComponentType<FillProps>;
}

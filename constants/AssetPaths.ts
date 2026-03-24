import { Skia } from "@shopify/react-native-skia";

/**
 * Predefined Skia Path objects for game assets.
 */
export const ASSET_PATHS = {
  // A more detailed ship shape
  SHIP: (() => {
    const path = Skia.Path.Make();
    path.moveTo(10, 0);
    path.lineTo(-5, 5);
    path.lineTo(-3, 2);
    path.lineTo(-3, -2);
    path.lineTo(-5, -5);
    path.close();
    return path;
  })(),

  // Four different asteroid shapes
  ASTEROID_1: (() => {
    const path = Skia.Path.Make();
    path.moveTo(1, 0);
    path.lineTo(0.5, 0.8);
    path.lineTo(-0.3, 0.9);
    path.lineTo(-0.8, 0.4);
    path.lineTo(-0.7, -0.6);
    path.lineTo(-0.2, -0.9);
    path.lineTo(0.6, -0.7);
    path.close();
    return path;
  })(),

  ASTEROID_2: (() => {
    const path = Skia.Path.Make();
    path.moveTo(1, 0.2);
    path.lineTo(0.7, 0.9);
    path.lineTo(-0.1, 0.7);
    path.lineTo(-0.6, 0.8);
    path.lineTo(-0.9, 0);
    path.lineTo(-0.5, -0.7);
    path.lineTo(0.2, -0.9);
    path.lineTo(0.8, -0.5);
    path.close();
    return path;
  })(),

  ASTEROID_3: (() => {
    const path = Skia.Path.Make();
    path.moveTo(0.8, 0.5);
    path.lineTo(0.2, 0.9);
    path.lineTo(-0.7, 0.7);
    path.lineTo(-0.8, -0.2);
    path.lineTo(-0.4, -0.8);
    path.lineTo(0.5, -0.9);
    path.lineTo(0.9, -0.3);
    path.close();
    return path;
  })(),

  ASTEROID_4: (() => {
    const path = Skia.Path.Make();
    path.moveTo(0.9, 0);
    path.lineTo(0.4, 0.7);
    path.lineTo(-0.2, 0.6);
    path.lineTo(-0.7, 0.9);
    path.lineTo(-0.9, 0.1);
    path.lineTo(-0.6, -0.8);
    path.lineTo(0.1, -0.7);
    path.lineTo(0.6, -0.9);
    path.close();
    return path;
  })(),

  THRUSTER: (() => {
    const path = Skia.Path.Make();
    path.moveTo(-5, 3);
    path.lineTo(-15, 0);
    path.lineTo(-5, -3);
    path.close();
    return path;
  })(),
};

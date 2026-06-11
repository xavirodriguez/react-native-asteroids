/**
 * @responsibility Handle quantization of floating point values to reduce payload size.
 */
export class Quantization {
  /**
   * Quantizes a float to an integer with a fixed scale.
   * @param value Float value
   * @param scale Scale factor (e.g. 100 for 2 decimal places)
   */
  public static quantize(value: number, scale: number = 100): number {
    return Math.round(value * scale);
  }

  /**
   * Dequantizes an integer back to a float.
   * @param value Quantized integer
   * @param scale Scale factor
   */
  public static dequantize(value: number, scale: number = 100): number {
    return value / scale;
  }

  /**
   * Specifically quantizes a Transform component's properties.
   */
  public static quantizeTransform(x: number, y: number, rotation: number) {
    return {
      x: this.quantize(x, 10), // 0.1 precision is usually enough for position
      y: this.quantize(y, 10),
      r: this.quantize(rotation, 100) // Higher precision for rotation
    };
  }
}

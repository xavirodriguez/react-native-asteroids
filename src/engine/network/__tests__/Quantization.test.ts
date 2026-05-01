import { Quantization } from "../Quantization";

describe("Quantization", () => {
  test("should quantize and dequantize correctly", () => {
    const value = 123.456;
    const quantized = Quantization.quantize(value, 100);
    expect(quantized).toBe(12346);

    const dequantized = Quantization.dequantize(quantized, 100);
    expect(dequantized).toBe(123.46);
  });

  test("should quantize transforms", () => {
    const x = 100.55;
    const y = 200.77;
    const r = 1.2345;

    const quantized = Quantization.quantizeTransform(x, y, r);
    expect(quantized.x).toBe(1006);
    expect(quantized.y).toBe(2008);
    expect(quantized.r).toBe(123);
  });
});

import { BinaryCompression } from "../BinaryCompression";

describe("BinaryCompression", () => {
  test("should pack and unpack data correctly", () => {
    const data = {
      id: 1,
      name: "test",
      nested: { x: 10, y: 20 },
      array: [1, 2, 3]
    };

    const packed = BinaryCompression.pack(data);
    expect(packed).toBeInstanceOf(Uint8Array);

    const unpacked = BinaryCompression.unpack<any>(packed);
    expect(unpacked).toEqual(data);
  });
});

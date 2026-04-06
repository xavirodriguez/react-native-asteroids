import { createTilemapComponent } from "../TilemapRenderSystem";

describe("TilemapSystem", () => {
  const mapData = {
    tileSize: 32,
    width: 10,
    height: 10,
    layers: [
      {
        name: "collision",
        tiles: [
          1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          1, 0, 1, 1, 1, 1, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        collidable: true,
      },
    ],
    tilesets: [
      { id: 1, textureId: "wall", solid: true },
    ],
  };

  it("should return true for solid tiles", () => {
    const tilemap = createTilemapComponent(mapData);
    expect(tilemap.isSolid(0, 0)).toBe(true);
    expect(tilemap.isSolid(0, 1)).toBe(true);
    expect(tilemap.isSolid(2, 1)).toBe(true);
  });

  it("should return false for empty tiles", () => {
    const tilemap = createTilemapComponent(mapData);
    expect(tilemap.isSolid(1, 0)).toBe(false);
    expect(tilemap.isSolid(1, 2)).toBe(false);
  });

  it("should return true for out-of-bounds coordinates", () => {
    const tilemap = createTilemapComponent(mapData);
    expect(tilemap.isSolid(-1, 0)).toBe(true);
    expect(tilemap.isSolid(10, 0)).toBe(true);
  });
});

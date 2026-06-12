export class SpatialGrid {
  constructor(public cellSize: number) {}
  clear(): void {}
  insert(_entity: number, _aabb: any): void {}
  getIntersectingCells(_aabb: any): string[] { return []; }
}

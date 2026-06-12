export type BroadPhase = {
  update(entities: any[]): void;
  query(aabb: any): any[];
};

export const BroadPhase = {
  getShapeBounds(_transform: any, _collider: any): any {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
};

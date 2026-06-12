export class PhysicsUtils {
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }
  static getShapeBounds(_transform: any, _collider: any): any {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
}

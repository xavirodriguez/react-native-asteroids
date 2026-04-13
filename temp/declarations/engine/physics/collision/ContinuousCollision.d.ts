export interface CCDResult {
    hit: boolean;
    timeOfImpact: number;
    normalX: number;
    normalY: number;
    contactX: number;
    contactY: number;
}
export declare class ContinuousCollision {
    static sweptCircleVsCircle(posAX: number, posAY: number, velAX: number, velAY: number, radiusA: number, posBX: number, posBY: number, radiusB: number, deltaTime: number): CCDResult;
    static sweptCircleVsAABB(posAX: number, posAY: number, velAX: number, velAY: number, radiusA: number, posBX: number, posBY: number, halfWB: number, halfHB: number, deltaTime: number): CCDResult;
    static sweptAABBVsAABB(posAX: number, posAY: number, velAX: number, velAY: number, hwA: number, hhA: number, posBX: number, posBY: number, hwB: number, hhB: number, deltaTime: number): CCDResult;
}

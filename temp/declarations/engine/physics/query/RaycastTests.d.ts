import { Ray } from "./QueryTypes";
export declare class RaycastTests {
    static rayVsCircle(ray: Ray, cx: number, cy: number, radius: number): {
        t: number;
        nx: number;
        ny: number;
    } | null;
    static rayVsAABB(ray: Ray, ax: number, ay: number, halfW: number, halfH: number): {
        t: number;
        nx: number;
        ny: number;
    } | null;
    static rayVsPolygon(ray: Ray, vertices: Array<{
        x: number;
        y: number;
    }>, px: number, py: number, pr: number): {
        t: number;
        nx: number;
        ny: number;
    } | null;
}

import { System } from "../core/System";
import { World } from "../core/World";
export interface DamageNumberComponent {
    type: "DamageNumber";
    value: number;
    velocity: {
        x: number;
        y: number;
    };
}
export declare class DamageNumberSystem extends System {
    static createDamageNumber(world: World, x: number, y: number, value: number, color?: string): void;
    update(world: World, deltaTime: number): void;
}

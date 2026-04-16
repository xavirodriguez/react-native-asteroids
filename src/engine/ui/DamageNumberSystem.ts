/**
 * @packageDocumentation
 * Floating damage numbers (pop-ups) system.
 * Animates text labels that represent damage or status changes in world space.
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { UIFactory } from "./UIFactory";
import { UIElementComponent } from "./UITypes";
import { TTLComponent } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";

/**
 * Component specific to damage number logic.
 *
 * @responsibility Store the numeric value and movement vector for a pop-up label.
 */
export interface DamageNumberComponent {
    type: "DamageNumber";
    /** The numeric value to display. */
    value: number;
    /** Current velocity in pixels per second. */
    velocity: { x: number; y: number };
}

/**
 * System that manages the creation and animation of damage numbers.
 *
 * @remarks
 * This system creates UI labels using {@link UIFactory} and adds physics-like
 * movement (velocity + gravity) to them. It also relies on a {@link TTLComponent}
 * to automatically remove the entities after a certain duration.
 *
 * @responsibility Spawn damage number labels at specific world coordinates.
 * @responsibility Update label positions and opacity over time.
 *
 * @example
 * ```ts
 * DamageNumberSystem.createDamageNumber(world, 100, 200, 50, "yellow");
 * ```
 */
export class DamageNumberSystem extends System {
    /**
     * Static factory method to spawn a new damage number.
     *
     * @param world - The ECS world.
     * @param x - Initial X coordinate in world space.
     * @param y - Initial Y coordinate in world space.
     * @param value - The damage value to display.
     * @param color - Color of the text. @defaultValue "red"
     *
     * @remarks
     * The method initializes the label with a random horizontal velocity and upward vertical velocity.
     * It also sets a default TTL (Time To Live) of 1000ms.
     */
    public static createDamageNumber(world: World, x: number, y: number, value: number, color: string = "red"): void {
        const entity = UIFactory.createLabel(world, {
            text: value.toString(),
            anchor: "top-left",
            fontSize: 20,
            color,
            zIndex: 1000
        });

        const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        // We use computedX/Y for initial placement, but UILayoutSystem will overwrite
        // root elements if they don't have parentEntity.
        // To allow manual movement, we either need a parent or a special flag.
        // For root elements, UILayoutSystem uses anchor + offsetX/Y.
        element.offsetX = x;
        element.offsetY = y;

        const gameplayRandom = RandomService.getInstance("gameplay");
        world.addComponent(entity, {
            type: "DamageNumber",
            value,
            velocity: { x: (gameplayRandom.next() - 0.5) * 40, y: -60 - gameplayRandom.next() * 40 }
        } as DamageNumberComponent);

        world.addComponent(entity, {
            type: "TTL",
            remaining: 1000,
            total: 1000
        } as TTLComponent);
    }

    /**
     * Updates all active damage numbers.
     *
     * @param world - The ECS world.
     * @param deltaTime - Time elapsed in milliseconds.
     *
     * @remarks
     * Applies gravity to velocity, updates offsets based on velocity,
     * and fades the element's opacity based on its remaining TTL.
     *
     * @mutates {@link UIElementComponent} - offsetX, offsetY, opacity.
     * @mutates {@link DamageNumberComponent} - velocity.y (gravity).
     */
    public update(world: World, deltaTime: number): void {
        const entities = world.query("DamageNumber", "UIElement", "TTL");
        const dt = deltaTime / 1000;

        for (const entity of entities) {
            const dn = world.getComponent<DamageNumberComponent>(entity, "DamageNumber")!;
            const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
            const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;

            element.offsetX += dn.velocity.x * dt;
            element.offsetY += dn.velocity.y * dt;
            element.opacity = ttl.remaining / ttl.total;

            // Apply "gravity" to the floating number
            dn.velocity.y += 100 * dt;
        }
    }
}

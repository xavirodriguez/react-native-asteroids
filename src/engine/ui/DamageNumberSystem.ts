import { System } from "../core/System";
import { World } from "../core/World";
import { UIFactory } from "./UIFactory";
import { UIElementComponent } from "./UITypes";
import { TTLComponent } from "../core/CoreComponents";

export interface DamageNumberComponent {
    type: "DamageNumber";
    value: number;
    velocity: { x: number; y: number };
}

export class DamageNumberSystem extends System {
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

        world.addComponent(entity, {
            type: "DamageNumber",
            value,
            velocity: { x: (Math.random() - 0.5) * 40, y: -60 - Math.random() * 40 }
        } as DamageNumberComponent);

        world.addComponent(entity, {
            type: "TTL",
            remaining: 1000,
            total: 1000
        } as TTLComponent);
    }

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

            dn.velocity.y += 100 * dt;
        }
    }
}

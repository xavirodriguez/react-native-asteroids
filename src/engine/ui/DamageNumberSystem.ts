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

        const commands = world.getCommandBuffer();

        commands.mutateComponent<UIElementComponent>(entity, "UIElement", element => {
            element.offsetX = x;
            element.offsetY = y;
        });

        const renderRandom = world.renderRandom;
        commands.addComponent(entity, {
            type: "DamageNumber",
            value,
            velocity: { x: (renderRandom.next() - 0.5) * 40, y: -60 - renderRandom.next() * 40 }
        } as DamageNumberComponent);

        commands.addComponent(entity, {
            type: "TTL",
            remaining: 1000,
            total: 1000
        } as TTLComponent);
    }

    public update(world: World, deltaTime: number): void {
        const entities = world.query("DamageNumber", "UIElement", "TTL");
        const dt = deltaTime / 1000;

        for (const entity of entities) {
            world.mutateComponent<DamageNumberComponent>(entity, "DamageNumber", dn => {
                world.mutateComponent<UIElementComponent>(entity, "UIElement", element => {
                    const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;
                    element.offsetX += dn.velocity.x * dt;
                    element.offsetY += dn.velocity.y * dt;
                    element.opacity = ttl.remaining / ttl.total;
                    dn.velocity.y += 100 * dt;
                });
            });
        }
    }
}

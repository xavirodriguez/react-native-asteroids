import { System } from "../../../packages/core/src/ecs/System";
import { World } from "../../../packages/core/src/ecs/World";
import { UIFactory } from "./UIFactory";
import { UIElementComponent } from "./UITypes";
import { TTLComponent } from "../../../packages/core/src/ecs/CoreComponents";

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
            const ttl = world.getComponent<TTLComponent>(entity, "TTL");
            if (!ttl) continue;

            let vx = 0;
            let vy = 0;

            world.mutateComponent<DamageNumberComponent>(entity, "DamageNumber", dn => {
                dn.velocity.y += 100 * dt;
                vx = dn.velocity.x;
                vy = dn.velocity.y;
            });

            world.mutateComponent<UIElementComponent>(entity, "UIElement", element => {
                element.offsetX += vx * dt;
                element.offsetY += vy * dt;
                element.opacity = ttl.remaining / ttl.total;
            });
        }
    }
}

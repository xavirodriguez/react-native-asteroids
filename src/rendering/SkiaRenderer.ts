import { World, Renderer, ShapeDrawer, EffectDrawer, Entity, RenderSnapshot, UISnapshot, RenderCommandBuffer, DrawCommand } from "@tiny-aster/core";
import { SkCanvas } from "@shopify/react-native-skia";

export class SkiaRenderer implements Renderer<SkCanvas> {
    private shapeDrawers = new Map<string, ShapeDrawer<SkCanvas>>();
    private effectDrawers = new Map<string, EffectDrawer<SkCanvas>>();

    registerShapeDrawer(shape: string, drawer: ShapeDrawer<SkCanvas>): void {
        this.shapeDrawers.set(shape, drawer);
    }

    registerEffectDrawer(effect: string, drawer: EffectDrawer<SkCanvas>): void {
        this.effectDrawers.set(effect, drawer);
    }

    render(world: World, canvas: SkCanvas): void {
        const snapshot = this.createSnapshot(world);
        
        for (const entity of snapshot.entities) {
            const drawer = this.shapeDrawers.get(entity.render.shape);
            if (drawer) {
                drawer(canvas, entity.id, { x: entity.transform.x, y: entity.transform.y }, 0, entity.render, world);
            }
        }
    }

    createSnapshot(world: World): RenderSnapshot {
        const entities: any[] = [];
        const query = world.query("Transform", "Render");
        
        for (const entity of query) {
            const transform = world.getComponent(entity, "Transform") as any;
            const render = world.getComponent(entity, "Render") as any;
            entities.push({
                id: entity,
                transform: { x: transform.x, y: transform.y, rotation: transform.rotation },
                render: { ...render }
            });
        }

        return {
            entities,
            timestamp: Date.now(),
            elapsedTime: 0
        };
    }

    addPreRenderHook(hook: any): void {}
    addPostRenderHook(hook: any): void {}
}

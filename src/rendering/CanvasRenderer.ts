import { World, Renderer, ShapeDrawer, EffectDrawer, Entity, RenderSnapshot, UISnapshot, RenderCommandBuffer, DrawCommand } from "@tiny-aster/core";

export class CanvasRenderer implements Renderer<CanvasRenderingContext2D> {
    private shapeDrawers = new Map<string, ShapeDrawer<CanvasRenderingContext2D>>();
    private effectDrawers = new Map<string, EffectDrawer<CanvasRenderingContext2D>>();
    private preRenderHooks: ((ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void)[] = [];
    private postRenderHooks: ((ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void)[] = [];

    registerShapeDrawer(shape: string, drawer: ShapeDrawer<CanvasRenderingContext2D>): void {
        this.shapeDrawers.set(shape, drawer);
    }

    registerEffectDrawer(effect: string, drawer: EffectDrawer<CanvasRenderingContext2D>): void {
        this.effectDrawers.set(effect, drawer);
    }

    addPreRenderHook(hook: (ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void): void {
        this.preRenderHooks.push(hook);
    }

    addPostRenderHook(hook: (ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot, world: World) => void): void {
        this.postRenderHooks.push(hook);
    }

    render(world: World, context: CanvasRenderingContext2D): void {
        const snapshot = this.createSnapshot(world);
        
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        for (const hook of this.preRenderHooks) {
            hook(context, snapshot, world);
        }

        // Render entities from snapshot
        for (const entity of snapshot.entities) {
            const drawer = this.shapeDrawers.get(entity.render.shape);
            if (drawer) {
                drawer(context, entity.id, { x: entity.transform.x, y: entity.transform.y }, 0, entity.render, world);
            }
        }

        for (const hook of this.postRenderHooks) {
            hook(context, snapshot, world);
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
}

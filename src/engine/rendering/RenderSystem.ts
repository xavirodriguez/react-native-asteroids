import { World } from "../core/World";
import { SceneGraph } from "../core/SceneGraph";
import { Renderer, RenderCommand } from "./RenderTypes";
import { RenderableComponent, Transform } from "../types/EngineTypes";

/**
 * System that generates render commands for all renderable entities.
 */
export class RenderSystem {
  private commandPool: RenderCommand[] = [];
  private activeCommands: RenderCommand[] = [];
  private poolIndex = 0;

  constructor(private renderer: Renderer, private sceneGraph: SceneGraph) {}

  /**
   * Iterates over entities with RenderableComponent and submits commands to the renderer.
   * Commands are pooled and sorted by zOrder.
   */
  public update(world: World, alpha: number): void {
    const renderables = world.getEntitiesWith("Renderable");
    this.poolIndex = 0;
    this.activeCommands.length = 0;

    for (const entityId of renderables) {
      const renderable = world.getComponent<RenderableComponent>(entityId, "Renderable")!;
      if (!renderable.visible) continue;

      const worldTransform = this.sceneGraph.getWorldTransform(entityId);
      if (!worldTransform) continue;

      const cmd = this.acquireCommand();
      cmd.type = renderable.shape;
      cmd.entityId = entityId;

      // Zero-allocation: Update properties individually
      this.copyTransform(cmd.worldTransform, worldTransform);

      cmd.alpha = alpha;
      cmd.textureId = renderable.textureId || undefined;
      cmd.width = renderable.width;
      cmd.height = renderable.height;
      cmd.color = renderable.color;
      cmd.zOrder = renderable.zOrder;
      cmd.visible = renderable.visible;

      this.activeCommands.push(cmd);
    }

    // Sort by zOrder
    this.activeCommands.sort((a, b) => a.zOrder - b.zOrder);

    // Submit to renderer
    this.renderer.beginFrame(alpha);
    for (const cmd of this.activeCommands) {
      this.renderer.submit(cmd);
    }
    this.renderer.endFrame();
  }

  private copyTransform(to: Transform, from: Transform): void {
    to.x = from.x;
    to.y = from.y;
    to.rotation = from.rotation;
    to.scaleX = from.scaleX;
    to.scaleY = from.scaleY;
  }

  private acquireCommand(): RenderCommand {
    if (this.poolIndex >= this.commandPool.length) {
      this.commandPool.push({
        type: 'rect',
        entityId: 0,
        worldTransform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        alpha: 0,
        zOrder: 0,
        visible: true
      });
    }
    return this.commandPool[this.poolIndex++];
  }
}

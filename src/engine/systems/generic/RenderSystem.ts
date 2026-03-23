import { System } from "../../core/System";
import { World } from "../../core/World";
import { IRenderer } from "../../rendering/IRenderer";

/**
 * A generic system for rendering entities.
 * It iterates through entities with 'Position' and 'Render' components and calls IRenderer methods.
 */
export class RenderSystem extends System {
  constructor(private renderer: IRenderer) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    void deltaTime;
    this.renderer.clear();

    const entities = world.query("Position", "Render");

    entities.forEach((entity) => {
      const pos = world.getComponent<{ x: number; y: number }>(entity, "Position");
      const render = world.getComponent<{
        shape: string;
        size: number;
        color: string;
        rotation: number;
        vertices?: { x: number; y: number }[];
      }>(entity, "Render");

      if (pos && render) {
        this.drawEntity(pos, render);
      }
    });

    this.updateScreenShake(world);
  }

  private updateScreenShake(world: World): void {
    const gameStateEntity = world.query("GameState")[0];
    if (!gameStateEntity) return;

    const gameState = world.getComponent<{ screenShake: any }>(gameStateEntity, "GameState");
    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      gameState.screenShake.duration--;
      if (gameState.screenShake.duration <= 0) {
        gameState.screenShake = null;
      }
    }
    world.version++;
  }

  private drawEntity(pos: { x: number; y: number }, render: any): void {
    const { shape, size, color, rotation, vertices } = render;

    switch (shape) {
      case "circle":
        this.renderer.drawCircle(pos.x, pos.y, size, color, true);
        break;
      case "rect":
        this.renderer.drawRect(pos.x - size / 2, pos.y - size / 2, size, size, color, true);
        break;
      case "line":
        const x2 = pos.x + Math.cos(rotation) * size;
        const y2 = pos.y + Math.sin(rotation) * size;
        this.renderer.drawLine(pos.x, pos.y, x2, y2, color, 2);
        break;
      case "triangle":
        const trianglePoints = [
          { x: size, y: 0 },
          { x: -size / 2, y: size / 2 },
          { x: -size / 2, y: -size / 2 },
        ];
        this.renderer.drawPolygon(pos.x, pos.y, trianglePoints, color, true, rotation);
        break;
      case "polygon":
        if (vertices) {
          this.renderer.drawPolygon(pos.x, pos.y, vertices, color, true, rotation);
        }
        break;
      case "particle":
        this.renderer.drawCircle(pos.x, pos.y, size, color, true);
        break;
    }
  }
}

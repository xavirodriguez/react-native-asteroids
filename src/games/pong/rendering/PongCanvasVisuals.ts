import { World, TransformComponent } from "@tiny-aster/core";
import { BallComponent } from "../types";

/**
 * Visuales personalizados para la bola de Pong.
 * Implementa una rotación visual basada en el spin factor.
 */
export const drawPongBall = (
  ctx: CanvasRenderingContext2D,
  entity: number,
  _pos: TransformComponent,
  _elapsedTime: number,
  render: any,
  world: World
): void => {
  const ballComp = world.getComponent(entity, "Ball" as any) as BallComponent;
  const rotation = ballComp ? ballComp.spinFactor * 5 : 0;

  ctx.save();
  ctx.rotate(rotation);

  // Cuerpo de la bola
  ctx.fillStyle = render.color || "white";
  const size = render.size || 10;

  // Dibujar un cuadrado rotado para dar sensación de giro
  ctx.fillRect(-size / 2, -size / 2, size, size);

  // Detalle visual (línea central)
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size / 2, 0);
  ctx.lineTo(size / 2, 0);
  ctx.stroke();

  ctx.restore();
};

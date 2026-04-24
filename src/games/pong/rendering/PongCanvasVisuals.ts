import { ShapeDrawer } from "../../../engine/presentation";
import { BallComponent } from "../systems/PongSpinSystem";

/**
 * Drawer especializado para la pelota de Pong que incluye efectos de rotación (spin).
 *
 * @responsibility Renderizar la pelota y su indicador visual de efecto físico.
 * @queries BallComponent - Para obtener el factor de rotación actual.
 */
export const drawPongBall: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, _elapsedTime, render, world) => {
  const { size, color } = render;
  const ballComp = world.getComponent<BallComponent>(entity, "Ball");

  // Draw core ball
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // Draw spin arc
  if (ballComp && ballComp.spinFactor !== 0) {
    ctx.save();
    ctx.strokeStyle = ballComp.spinFactor > 0 ? "#FF8800" : "#0088FF";
    ctx.lineWidth = Math.abs(ballComp.spinFactor) * 3;
    ctx.beginPath();
    // Arc indicating rotation direction
    const startAngle = ballComp.spinFactor > 0 ? 0 : Math.PI;
    ctx.arc(0, 0, size + 4, startAngle, startAngle + Math.PI * Math.abs(ballComp.spinFactor));
    ctx.stroke();
    ctx.restore();
  }
};

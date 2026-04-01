import { ShapeDrawer, EffectDrawer } from "../../../engine/rendering/Renderer";
import { RenderComponent, PositionComponent } from "../../../engine/types/EngineTypes";
import { FlappyBirdState, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { getGameState } from "../GameUtils";

/**
 * Visuals for the bird.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, pos, render, world) => {
  const { size, color } = render;

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eye
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(size * 0.4, -size * 0.3, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(size * 0.5, -size * 0.3, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#FF4500";
  ctx.beginPath();
  ctx.moveTo(size * 0.7, -size * 0.1);
  ctx.lineTo(size * 1.2, 0);
  ctx.lineTo(size * 0.7, size * 0.2);
  ctx.fill();

  // Wing
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(-size * 0.2, size * 0.1, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Visuals for a pipe segment.
 */
export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, pos, render, world) => {
  const { size, color } = render;
  const width = size;
  const halfWidth = width / 2;

  // Base pipe
  ctx.fillStyle = color;
  ctx.fillRect(-halfWidth, -400, width, 800); // Draw long enough

  // Border
  ctx.strokeStyle = "#1a5e3b";
  ctx.lineWidth = 2;
  ctx.strokeRect(-halfWidth, -400, width, 800);

  // Cap
  const capHeight = 30;
  const capExtraWidth = 10;
  ctx.fillStyle = color;

  // We need to know if it's top or bottom pipe based on Y position
  if (pos.y < FLAPPY_CONFIG.SCREEN_HEIGHT / 2) {
    // Top pipe - cap at bottom
    ctx.fillRect(-halfWidth - capExtraWidth / 2, 400 - capHeight, width + capExtraWidth, capHeight);
    ctx.strokeRect(-halfWidth - capExtraWidth / 2, 400 - capHeight, width + capExtraWidth, capHeight);
  } else {
    // Bottom pipe - cap at top
    ctx.fillRect(-halfWidth - capExtraWidth / 2, -400, width + capExtraWidth, capHeight);
    ctx.strokeRect(-halfWidth - capExtraWidth / 2, -400, width + capExtraWidth, capHeight);
  }
};

/**
 * Visuals for the ground.
 */
export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, pos, render, world) => {
  const { size, color } = render;
  const width = size;
  const height = 40;

  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, -height / 2, width, height);

  // Grass top
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(-width / 2, -height / 2, width, 5);
};

/**
 * Scrolling sky background effect.
 */
export let bgOffset = 0;
export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, world, width, height) => {
  const gameState = getGameState(world);

  // Background sky
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#3498db");
  gradient.addColorStop(1, "#87ceeb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Scroll logic
  if (!gameState.isGameOver) {
    bgOffset = (bgOffset + 0.5) % width;
  }

  // Simple clouds
  ctx.fillStyle = "white";
  for (let i = 0; i < 5; i++) {
    const x = (i * 150 - bgOffset + width) % width;
    const y = 50 + (i % 2) * 40;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2);
    ctx.arc(x + 30, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
};

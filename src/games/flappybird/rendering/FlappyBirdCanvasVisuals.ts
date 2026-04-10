import { ShapeDrawer, EffectDrawer } from "../../../engine/rendering/Renderer";
import { HealthComponent } from "../../../engine/types/EngineTypes";
import { FLAPPY_CONFIG, FlappyBirdState } from "../types/FlappyBirdTypes";

/**
 * Visuals for the bird.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, render, world) => {
  const { size, color } = render;

  const health = world.getComponent<HealthComponent>(entity, "Health");
  if (health && health.invulnerableRemaining > 0) {
    ctx.globalAlpha = (Math.floor(health.invulnerableRemaining / 100) % 2 === 0) ? 0.3 : 1.0;
  }

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

  ctx.globalAlpha = 1.0;
};

/**
 * Visuals for a pipe segment.
 */
export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, pos, render, world) => {
  const { size, color } = render;
  const width = size;
  const halfWidth = width / 2;

  const pipe = world.getComponent(entity, "Pipe") as any;
  if (!pipe) return;

  const halfGap = pipe.gapSize / 2;
  const isTopPipe = pos.y < pipe.gapY;

  let pipeY: number;
  let pipeHeight: number;

  if (isTopPipe) {
    // Top pipe: draws from top of screen to gap top
    // Current pos.y is (gapY - halfGap) / 2
    // We want to draw from Y=0 to Y=(gapY - halfGap)
    // Relative to pos.y:
    pipeY = -pos.y;
    pipeHeight = pipe.gapY - halfGap;
  } else {
    // Bottom pipe: draws from gap bottom to screen bottom
    // Current pos.y is (gapY + halfGap) + (SCREEN_HEIGHT - (gapY + halfGap)) / 2
    // We want to draw from Y=(gapY + halfGap) to Y=SCREEN_HEIGHT
    // Relative to pos.y:
    pipeY = (pipe.gapY + halfGap) - pos.y;
    pipeHeight = FLAPPY_CONFIG.SCREEN_HEIGHT - (pipe.gapY + halfGap);
  }

  // Base pipe
  ctx.fillStyle = color;
  ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

  // Border
  ctx.strokeStyle = "#1a5e3b";
  ctx.lineWidth = 2;
  ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

  // Cap
  const capHeight = 30;
  const capExtraWidth = 10;
  ctx.fillStyle = color;

  if (isTopPipe) {
    // Top pipe - cap at bottom
    ctx.fillRect(-halfWidth - capExtraWidth / 2, pipeY + pipeHeight - capHeight, width + capExtraWidth, capHeight);
    ctx.strokeRect(-halfWidth - capExtraWidth / 2, pipeY + pipeHeight - capHeight, width + capExtraWidth, capHeight);
  } else {
    // Bottom pipe - cap at top
    ctx.fillRect(-halfWidth - capExtraWidth / 2, pipeY, width + capExtraWidth, capHeight);
    ctx.strokeRect(-halfWidth - capExtraWidth / 2, pipeY, width + capExtraWidth, capHeight);
  }
};

/**
 * Visuals for the ground.
 */
export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render, _world) => {
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
let bgOffset = 0;
export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, world, width, height) => {
  const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
  if (!gameState) return;

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

/**
 * Draw speed lines during fast descent.
 */
export const drawSpeedLines: EffectDrawer<CanvasRenderingContext2D> = (ctx, world, width, height) => {
  const birds = world.query("Bird", "Transform");
  if (birds.length === 0) return;

  const birdEntity = birds[0];
  const bird = world.getComponent<any>(birdEntity, "Bird");
  if (!bird || bird.velocityY < FLAPPY_CONFIG.GRAVITY * 0.7) return;

  const maxFallSpeed = 600;
  const velocityY = bird.velocityY;
  const intensity = Math.min(velocityY / maxFallSpeed, 1);
  const lineCount = 8;
  const opacity = intensity * 0.6;

  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.lineWidth = 2;

  const frameCount = Date.now(); // Use timestamp for animation since World has no _frameCount

  for (let i = 0; i < lineCount; i++) {
    // Semi-random but consistent positions
    const side = i % 2 === 0 ? 20 : width - 20;
    const y = ((i * 137 + frameCount * 10) % height);
    const length = intensity * 60;

    ctx.beginPath();
    ctx.moveTo(side, y);
    ctx.lineTo(side, y + length);
    ctx.stroke();
  }
};

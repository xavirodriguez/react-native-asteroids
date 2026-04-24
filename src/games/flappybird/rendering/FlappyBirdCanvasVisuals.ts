import { ShapeDrawer, EffectDrawer } from "../../../engine/presentation";
import { HealthComponent } from "../../../engine/EngineTypes";
import { FLAPPY_CONFIG, FlappyBirdState } from "../types/FlappyBirdTypes";

/**
 * Visuals for the bird.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, _elapsedTime, render, world) => {
  const { size, color } = render;

  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    color = "white";
  }

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

  // Glide trail/indicator
  const birdComp = world.getComponent<BirdComponent>(entity, "Bird");
  if (birdComp?.isGliding) {
    ctx.strokeStyle = "rgba(170, 221, 255, 0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 2, 0);
    ctx.stroke();
  }

  // Near Miss text
  if (birdComp && birdComp.nearMissTimer > 0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
    const alpha = birdComp.nearMissTimer / 300; // Assuming 300ms near miss timer
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NEAR MISS! +50", pos.x, pos.y - 40);
    ctx.restore();
  }

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
export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, pos, _elapsedTime, render, world) => {
  const { size, color } = render;
  const width = size;
  const halfWidth = width / 2;

  const pipe = world.getComponent<import("../EntityFactory").PipeComponent>(entity, "Pipe");
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
export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render, _world) => {
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
export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, snapshot, width, height, world) => {
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

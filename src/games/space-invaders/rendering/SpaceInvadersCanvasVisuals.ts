import { ShapeDrawer, EffectDrawer } from "../../../engine/presentation";
import { RandomService } from "../../../engine/RandomService";
import { GameStateComponent } from "../types/SpaceInvadersTypes";

/**
 * Visuals for the player ship.
 */
export const drawSpaceInvadersPlayer: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render, _world) => {
  const { size } = render;
  let { color } = render;

  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    color = "white";
  }

  ctx.fillStyle = color;

  // Basic tank shape
  ctx.fillRect(-size / 2, -size / 4, size, size / 2);
  ctx.fillRect(-size / 6, -size / 2, size / 3, size / 4);
};

/**
 * Visuals for an invader.
 */
export const drawSpaceInvadersInvader: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render, _world) => {
  const { size } = render;
  let { color } = render;

  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    color = "white";
  }

  ctx.fillStyle = color;

  // Simple pixelated invader shape
  const s = size / 11;

  // Example shape (very basic crab-like)
  ctx.fillRect(-s * 4, -s * 2, s * 8, s);
  ctx.fillRect(-s * 5, -s, s * 10, s);
  ctx.fillRect(-s * 5, 0, s * 2, s);
  ctx.fillRect(-s * 2, 0, s * 4, s);
  ctx.fillRect(s * 3, 0, s * 2, s);
  ctx.fillRect(-s * 5, s, s, s);
  ctx.fillRect(-s * 2, s, s, s);
  ctx.fillRect(s, s, s, s);
  ctx.fillRect(s * 4, s, s, s);
};

/**
 * Visuals for bullets.
 */
export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render, _world) => {
  const { size, color } = render;
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size, size, size * 2);
};

/**
 * Visuals for shield blocks.
 */
export const drawSpaceInvadersShield: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render, _world) => {
  const { size } = render;
  let { color } = render;

  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    color = "white";
  }

  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
};

/**
 * Visuals for particles.
 */
export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render, _world) => {
  const { size, color } = render;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Screen shake background effect.
 */
export const spaceInvadersScreenShakeEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, _snapshot, _width, _height, world) => {
  const gameState = world.getSingleton<GameStateComponent>("GameState");
  if (gameState && gameState.screenShake && gameState.screenShake.duration > 0) {
    const { intensity } = gameState.screenShake;
    const renderRandom = RandomService.getRenderRandom();
    const dx = (renderRandom.next() - 0.5) * intensity;
    const dy = (renderRandom.next() - 0.5) * intensity;
    ctx.translate(dx, dy);
  }
};

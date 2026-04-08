import { ShapeDrawer, EffectDrawer } from "../../../engine/rendering/Renderer";
import { RenderComponent } from "../../../engine/types/EngineTypes";
import { RandomService } from "../../../engine/utils/RandomService";
import { GameStateComponent } from "../types/SpaceInvadersTypes";

/**
 * Visuals for the player ship.
 */
export const drawSpaceInvadersPlayer: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render, _world) => {
  const { size, color } = render;
  ctx.fillStyle = color;

  // Basic tank shape
  ctx.fillRect(-size / 2, -size / 4, size, size / 2);
  ctx.fillRect(-size / 6, -size / 2, size / 3, size / 4);
};

/**
 * Visuals for an invader.
 */
export const drawSpaceInvadersInvader: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render, _world) => {
  const { size, color } = render;
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
export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render, _world) => {
  const { size, color } = render;
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size, size, size * 2);
};

/**
 * Visuals for shield blocks.
 */
export const drawSpaceInvadersShield: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render, _world) => {
  const { size, color } = render;
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
};

/**
 * Visuals for particles.
 */
export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render, _world) => {
  const { size, color } = render;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Screen shake background effect.
 */
export const spaceInvadersScreenShakeEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, world) => {
  const entities = world.query("GameState");
  if (entities.length === 0) return;

  const gameState = world.getComponent<GameStateComponent>(entities[0], "GameState");
  if (gameState && gameState.screenShake && gameState.screenShake.duration > 0) {
    const { intensity } = gameState.screenShake;
    const dx = (RandomService.next() - 0.5) * intensity;
    const dy = (RandomService.next() - 0.5) * intensity;
    ctx.translate(dx, dy);
  }
};

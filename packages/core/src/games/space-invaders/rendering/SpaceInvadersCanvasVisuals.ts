import { ShapeDrawer, EffectDrawer, World } from "../../../index";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/**
 * Visuals for the player ship.
 */
export const drawSpaceInvadersPlayer: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 40 } = render;
    let { color = "#00FF00" } = render;

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
    ctx.globalAlpha = 1.0;
  }
};

/**
 * Visuals for an invader.
 */
export const drawSpaceInvadersInvader: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;
    let { color = "white" } = render;

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
    ctx.globalAlpha = 1.0;
  }
};

/**
 * Visuals for bullets.
 */
export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 4, color = "yellow" } = render;
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size, size, size * 2);
  }
};

/**
 * Visuals for shield blocks.
 */
export const drawSpaceInvadersShield: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;
    let { color = "#00FF00" } = render;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.globalAlpha = 1.0;
  }
};

/**
 * Visuals for particles.
 */
export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 2, color = "white" } = render;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
};

/**
 * Screen shake background effect.
 */
export const spaceInvadersScreenShakeEffect: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("GameState");
    if (gameState && gameState.screenShake && gameState.screenShake.duration > 0) {
      const { intensity } = gameState.screenShake;
      const renderRandom = world.renderRandom;
      const dx = (renderRandom.next() - 0.5) * intensity;
      const dy = (renderRandom.next() - 0.5) * intensity;
      ctx.translate(dx, dy);
    }
  }
};

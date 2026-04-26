import { ShapeDrawer, EffectDrawer } from "../../../engine/rendering/Renderer";
import { TTLComponent, HealthComponent, VelocityComponent, TrailComponent } from "../../../engine/types/EngineTypes";
import { RandomService } from "../../../engine/utils/RandomService";
import { InputComponent, GameStateComponent } from "../types/AsteroidTypes";

export const drawAsteroidsShip: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, _elapsedTime, render, world) => {
  const size = render.size;

  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
  } else {
    ctx.strokeStyle = render.color;
  }
  const input = world.getComponent<InputComponent>(entity, "Input");
  const health = world.getComponent<HealthComponent>(entity, "Health");

  if (health && health.invulnerableRemaining > 0) {
    if (Math.floor(health.invulnerableRemaining / 150) % 2 === 0) ctx.globalAlpha = 0.3;
  }

  // Ship Trail (Requirement 2 & Vol 2. 2.1)
  const trail = world.getComponent<TrailComponent>(entity, "Trail");
  if (trail && trail.count > 0) {
    ctx.save();

    const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
    const speed = vel ? Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy) : 0;

    let trailColor = "#4488FF"; // Cold blue
    if (speed > 150) trailColor = "#FFFFFF"; // Plasma white
    else if (speed > 50) trailColor = "#88AAFF"; // Light blue

    const cos = Math.cos(-_pos.rotation);
    const sin = Math.sin(-_pos.rotation);

    for (let i = 0; i < trail.count; i++) {
        const index = (trail.currentIndex - (trail.count - 1) + i + trail.maxLength) % trail.maxLength;
        const p = trail.points[index];
        if (!p) continue;

        // BUG 1 Fix: Transform world point p to local space to avoid destroying camera with setTransform
        const dx = p.x - _pos.x;
        const dy = p.y - _pos.y;
        const lx = (dx * cos - dy * sin) / (_pos.scaleX || 1);
        const ly = (dx * sin + dy * cos) / (_pos.scaleY || 1);

        const alpha = (i / trail.count) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = trailColor;
        ctx.beginPath();
        ctx.arc(lx, ly, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Synthetic point to close the gap (BUG 3)
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = trailColor;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Thrust Propulsion Flame
  if (input?.thrust) {
    ctx.save();
    const renderRandom = RandomService.getInstance("render");
    const flameLen = size * (1.2 + renderRandom.next() * 0.4);
    const gradient = ctx.createLinearGradient(-size / 2, 0, -flameLen, 0);
    gradient.addColorStop(0, "orange");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "rgba(255, 255, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-size / 2, size / 3);
    ctx.lineTo(-flameLen, 0);
    ctx.lineTo(-size / 2, -size / 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size / 2, size / 2);
  ctx.lineTo(-size / 4, 0);
  ctx.lineTo(-size / 2, -size / 2);
  ctx.closePath();
  ctx.stroke();

  // Ship Details
  ctx.fillStyle = "red";
  ctx.fillRect(-size / 2, size / 6, size / 6, size / 8);
  ctx.fillRect(-size / 2, -size / 6 - size / 8, size / 6, size / 8);
};

export const drawAsteroidsUfo: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render) => {
  const size = render.size;
  const color = render.color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.ellipse(0, -size / 4, size / 2, size / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "yellow";
  ctx.beginPath(); ctx.arc(-size / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, size / 6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(size / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
};

export const asteroidsStarfieldEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, _snapshot, _width, _height, world) => {
  const gameState = world.getSingleton<GameStateComponent>("GameState");

  if (gameState?.stars) {
    // Requirement 3: Draw all stars static with globalAlpha = brightness
    for (let i = 0; i < gameState.stars.length; i++) {
      const star = gameState.stars[i];
      ctx.globalAlpha = star.brightness;
      ctx.fillStyle = "white";
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1.0;
  }
};

export const asteroidsCRTEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, _snapshot, width, height, _world) => {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }

  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, width / 3,
    width / 2, height / 2, width * 0.8
  );
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, _elapsedTime, render) => {
  const size = render.size;
  const color = render.color;

  ctx.save();
  ctx.shadowColor = "#ffffaa";
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const drawAsteroidsParticle: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, _elapsedTime, render, world) => {
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  if (!ttl) return;

  const alpha = ttl.remaining / ttl.total;

  // Requirement 1: Orange-red-white shift
  const hue = 30 + (entity % 20); // 30 (Orange) to 50 (Yellow-ish)
  const lightness = 50 + alpha * 30; // 50 (Orange/Red) to 80 (White-ish)
  ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
  ctx.globalAlpha = alpha;

  // Requirement 1: Size variation that reduces with time
  const size = render.size * alpha;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
};

export const drawAsteroidsAsteroid: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, _elapsedTime, render) => {
  const { color, vertices, hitFlashFrames } = render;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Improvement 9: Hit flash effect
  if (hitFlashFrames && hitFlashFrames > 0) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
  }

  if (vertices && vertices.length > 0) {
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    // Fallback if no vertices (shouldn't happen with factory)
    ctx.beginPath();
    ctx.arc(0, 0, render.size, 0, Math.PI * 2);
    ctx.stroke();
  }
};

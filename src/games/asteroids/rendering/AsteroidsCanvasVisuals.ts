import { ShapeDrawer, EffectDrawer } from "../../../engine/rendering/Renderer";
import { PositionComponent, HealthComponent, TTLComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, GameStateComponent, ShipComponent, RenderComponent } from "../../../types/GameTypes";

export const drawAsteroidsShip: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, _pos, render, world) => {
  const size = render.size;
  const input = world.getComponent<InputComponent>(entity, "Input");
  const health = world.getComponent<HealthComponent>(entity, "Health");

  if (health && health.invulnerableRemaining > 0) {
    if (Math.floor(Date.now() / 150) % 2 === 0) ctx.globalAlpha = 0.3;
  }

  // Ship Trail (Requirement 2)
  const ship = world.getComponent<ShipComponent>(entity, "Ship");
  if (ship && ship.trailPositions && ship.trailPositions.length > 0) {
    ctx.save();
    // We need to draw in global coordinates. Since drawEntity already translated/rotated, we reset.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ship.trailPositions.forEach((p, i) => {
        const alpha = (i / ship.trailPositions!.length) * 0.4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#00ffff"; // Cyan
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
  }

  // Thrust Propulsion Flame
  if (input?.thrust) {
    ctx.save();
    const flameLen = size * (1.2 + Math.random() * 0.4);
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

  ctx.strokeStyle = render.color;
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

export const drawAsteroidsUfo: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render) => {
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

export const asteroidsStarfieldEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, world) => {
  const gameStateEntity = world.query("GameState")[0];
  const gameState = gameStateEntity ? world.getComponent<GameStateComponent>(gameStateEntity, "GameState") : null;

  if (gameState?.stars) {
    // Requirement 3: Draw all stars static with globalAlpha = brightness
    gameState.stars.forEach((star) => {
      ctx.globalAlpha = star.brightness;
      ctx.fillStyle = "white";
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;
  }
};

export const asteroidsCRTEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, _world, width, height) => {
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

export const asteroidsScreenShakeEffect: EffectDrawer<CanvasRenderingContext2D> = (ctx, world) => {
    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity ? world.getComponent<GameStateComponent>(gameStateEntity, "GameState") : null;

    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      const shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
      const shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
      ctx.translate(shakeX, shakeY);
    }
};

export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D> = (ctx, _entity, _pos, render) => {
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

export const drawAsteroidsParticle: ShapeDrawer<CanvasRenderingContext2D> = (ctx, entity, pos, render, world) => {
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

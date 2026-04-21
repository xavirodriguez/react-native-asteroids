import { World } from "../../../engine/core/World";
import { Entity } from "../../../engine/core/Entity";
import { TransformComponent, TTLComponent, HealthComponent, Star, TrailComponent } from "../../../engine/core/CoreComponents";
import { drawStarField } from "../../../engine/rendering/StarField";
import { RandomService } from "../../../engine/utils/RandomService";
import { InputComponent, GameStateComponent } from "../types/AsteroidTypes";

export const drawShip = (ctx: CanvasRenderingContext2D, entity: Entity, _pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number }, elapsedTime: number, render: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null }, world: World) => {
    const size = render.size;
    const input = world.getComponent<InputComponent>(entity, "Input");
    const health = world.getComponent<HealthComponent>(entity, "Health");

    if (health && health.invulnerableRemaining > 0) {
      // Flash effect for invulnerability/hits
      if (Math.floor(elapsedTime / 150) % 2 === 0) ctx.globalAlpha = 0.3;
    }

    // Improvement 8: Thrust Propulsion Flame
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

export const drawAsteroidShipTrailDrawer = (ctx: CanvasRenderingContext2D, entity: Entity, _pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number }, _elapsedTime: number, render: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null }, world: World) => {
    const trail = world.getComponent<TrailComponent>(entity, "Trail");
    if (trail) {
        drawAsteroidShipTrail(ctx, trail, render.size);
    }
};

export const drawUfo = (ctx: CanvasRenderingContext2D, entity: Entity, _pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number }, _elapsedTime: number, render: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null },  _world: World) => {
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

export const drawFlash = (ctx: CanvasRenderingContext2D, entity: Entity, _pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number }, _elapsedTime: number, render: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null }, world: World) => {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    if (!ttl) return;
    const size = render.size;
    ctx.globalAlpha = (ttl.remaining / ttl.total) * 0.5;
    ctx.fillStyle = "white";
    ctx.shadowColor = "white";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
};

export function drawAsteroidStarField(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, world: World, elapsedTime: number): void {
    const shipEntity = world.query("Ship", "Transform")[0];
    const shipPos = shipEntity
      ? world.getComponent<TransformComponent>(shipEntity, "Transform")
      : { x: width / 2, y: height / 2 } as TransformComponent;

    if (!shipPos) return;

    drawStarField(ctx, stars, width, height, shipPos, elapsedTime);
}

export function drawAsteroidCRTEffect(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    // Improvement 10: Scanlines every 3-4 pixels
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    // Improvement 10: Radial gradient vignette
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, width / 3,
      width / 2, height / 2, width * 0.8
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

export function drawAsteroidShipTrail(ctx: CanvasRenderingContext2D, trail: TrailComponent, shipSize: number): void {
    // Improvement 2: Trail cyan with alpha/size fade
    for (let i = 0; i < trail.count; i++) {
      // Iterar desde el punto más antiguo al más nuevo en el buffer circular
      const index = (trail.currentIndex - (trail.count - 1) + i + trail.maxLength) % trail.maxLength;
      const p = trail.points[index];
      if (!p) continue;

      const ratio = i / trail.count;
      const alpha = ratio * 0.4;
      const currentSize = 1 + ratio * (shipSize / 3); // Improvement 2: size fade

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent, HealthComponent, VelocityComponent } from "../types/EngineTypes";
import { drawStarField } from "../../game/StarField";
import { GameStateComponent, ShipComponent, InputComponent } from "../../types/GameTypes";

/**
 * Procedural Canvas 2D Renderer implementation.
 * Ported with full visual features (Starfields, CRT, Screen Shake, Thrusters, Particles).
 */
export class CanvasRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor(ctx?: CanvasRenderingContext2D) {
    if (ctx) {
      this.ctx = ctx;
    }
  }

  public setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public clear(): void {
    if (!this.ctx) return;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public render(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.clear();

    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity
      ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState"))
      : null;

    // Improvement 3: Starfield (Drawn first, static/parallax)
    if (gameState?.stars) {
      this.drawStarField(ctx, gameState.stars, world);
    }

    // Improvement 4: Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
      shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
      gameState.screenShake.duration--;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Improvement 3: Starfield
    if (gameState?.stars) {
      this.drawStarField(ctx, gameState.stars);
    }

    // Render Entities
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (pos && render) {
        this.drawEntity(entity, pos, render, world);

        // Improvement 14: Visual Wrap-around (fade at edges)
        this.drawWrapAround(entity, pos, render, world);
      }
    });

    this.drawParticles(world);

    ctx.restore();

    // Improvement 10: CRT Effect (Scanlines and Vignette)
    if (gameState?.debugCRT !== false) {
      this.drawCRTEffect(ctx);
    }
  }

  public drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Improvement 2: Ship Trail (Draw before the ship)
    const ship = world.getComponent<ShipComponent>(entity, "Ship");
    if (ship && ship.trailPositions) {
      this.drawShipTrail(ctx, ship.trailPositions, pos);
    }

    ctx.save();
    // Improvement 17: Hyperspace fade
    if (ship && ship.hyperspaceTimer > 0) {
      ctx.globalAlpha *= (1 - (ship.hyperspaceTimer / 500));
    }

    // Improvement 20: Motion Blur for fast entities
    const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
    if (vel && render.trailPositions && render.trailPositions.length > 2) {
      const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);
      if (speed > 200) {
        this.drawMotionBlur(entity, render, world);
      }
    }

    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    // Improvement 6: Glow for bullets
    const isBullet = world.hasComponent(entity, "Bullet");
    if (isBullet) {
      ctx.shadowColor = "#ffffaa";
      ctx.shadowBlur = 12;

      // Improvement 16: Bullet streak trail (lines)
      if (render.trailPositions && render.trailPositions.length > 1) {
        this.drawBulletStreak(ctx, render.trailPositions, pos);
      }
    }

    // Render shapes
    switch (render.shape) {
      case "triangle":
        this.drawShip(ctx, world, entity, render);
        break;
      case "polygon":
        this.drawPolygon(ctx, render);
        break;
      case "circle":
        this.drawCircle(ctx, render.size, render.color);
        break;
      case "ufo":
        this.drawUfo(ctx, render.size, render.color);
        break;
      case "flash":
        this.drawFlash(ctx, world, entity, render.size);
        break;
      case "line":
        this.drawLine(ctx, render.size, render.color);
        break;
    }

    ctx.restore();
  }

  private drawMotionBlur(entity: Entity, render: RenderComponent, world: World): void {
    const trail = render.trailPositions!;
    const ghostIndices = [trail.length - 2, trail.length - 3];
    const ctx = this.ctx!;
    ghostIndices.forEach((idx, i) => {
      if (idx >= 0) {
        const ghostPos = trail[idx];
        ctx.save();
        ctx.globalAlpha *= (0.15 + i * 0.15);
        this.drawEntity(entity, { type: "Position", x: ghostPos.x, y: ghostPos.y }, render, world);
        ctx.restore();
      }
    });
  }

  private drawWrapAround(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void {
    const { x, y } = pos;
    const size = render.size;
    const width = this.width;
    const height = this.height;

    let wrapX = x;
    let wrapY = y;
    let shouldDraw = false;

    if (x < size) { wrapX = x + width; shouldDraw = true; }
    else if (x > width - size) { wrapX = x - width; shouldDraw = true; }

    if (y < size) { wrapY = y + height; shouldDraw = true; }
    else if (y > height - size) { wrapY = y - height; shouldDraw = true; }

    if (shouldDraw) {
      this.ctx!.save();
      this.ctx!.globalAlpha *= 0.5;
      this.drawEntity(entity, { ...pos, x: wrapX, y: wrapY }, render, world);
      this.ctx!.restore();
    }

    // Corner cases
    if ( (x < size || x > width - size) && (y < size || y > height - size) ) {
        const cornerX = x < size ? x + width : x - width;
        const cornerY = y < size ? y + height : y - height;
        this.ctx!.save();
        this.ctx!.globalAlpha *= 0.5;
        this.drawEntity(entity, { ...pos, x: cornerX, y: cornerY }, render, world);
        this.ctx!.restore();
    }
  }

  public drawParticles(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const entities = world.query("Position", "Render").filter((e) => {
      const r = world.getComponent<RenderComponent>(e, "Render");
      return r?.shape === "particle";
    });

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (!ttl) return;

      const alpha = ttl.remaining / ttl.total;
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Improvement 1: Improved particles
      const randomVar = entity % 20;
      ctx.fillStyle = `hsl(${30 + randomVar}, 100%, ${50 + alpha * 30}%)`;
      ctx.globalAlpha = alpha;

      const size = render.size * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawShip(ctx: CanvasRenderingContext2D, world: World, entity: Entity, render: RenderComponent): void {
    const size = render.size;
    const input = world.getComponent<InputComponent>(entity, "Input");
    const health = world.getComponent<HealthComponent>(entity, "Health");

    if (health && health.invulnerableRemaining > 0) {
      if (Math.floor(Date.now() / 150) % 2 === 0) ctx.globalAlpha = 0.3;
    }

    // Improvement 8: Thrust Propulsion Flame
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
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, render: RenderComponent): void {
    if (!render.vertices || render.vertices.length === 0) {
      this.drawCircle(ctx, render.size, render.color);
      return;
    }

    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 2;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      ctx.strokeStyle = "white";
    }

    ctx.beginPath();
    ctx.moveTo(render.vertices[0].x, render.vertices[0].y);
    for (let i = 1; i < render.vertices.length; i++) {
      ctx.lineTo(render.vertices[i].x, render.vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Improvement 19: Internal lines (cracks/craters)
    if (render.internalLines) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      render.internalLines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  private drawCircle(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawUfo(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    // Improvement 13: Red glow for UFO (Refined with save/restore)
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = "red";

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.ellipse(0, -size / 4, size / 2, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "yellow";
    ctx.beginPath(); ctx.arc(-size / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, size / 6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  private drawFlash(ctx: CanvasRenderingContext2D, world: World, entity: Entity, size: number): void {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    if (!ttl) return;
    const alpha = (ttl.remaining / ttl.total) * 0.7;
    ctx.save();
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.3, "rgba(255, 255, 200, 0.8)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.shadowColor = "white";
    ctx.shadowBlur = 30 * (ttl.remaining / ttl.total);
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawLine(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.stroke();
  }

  private drawBulletStreak(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], currentPos: PositionComponent): void {
    // Improvement 16: Bullet streak (Relative to current draw position for wrap-around)
    ctx.save();
    ctx.lineWidth = 2;
    for (let i = 0; i < trail.length - 1; i++) {
      const p1 = trail[i];
      const p2 = trail[i + 1];
      // Skip segments that jump across the screen due to wrap-around
      if (Math.abs(p1.x - p2.x) > 100 || Math.abs(p1.y - p2.y) > 100) continue;

      const alpha = (i / trail.length) * 0.6;
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x - currentPos.x, p1.y - currentPos.y);
      ctx.lineTo(p2.x - currentPos.x, p2.y - currentPos.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawShipTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], currentPos: PositionComponent): void {
    // Improvement 2: Trail cyan with alpha fade (Relative to current draw position for wrap-around)
    ctx.save();
    trail.forEach((p, i) => {
      const alpha = (i / trail.length) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(p.x - currentPos.x, p.y - currentPos.y, 1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  private drawStarField(ctx: CanvasRenderingContext2D, stars: any[]): void {
    stars.forEach((star) => {
      ctx.globalAlpha = star.brightness;
      ctx.fillStyle = "white";
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;
  }

  private drawCRTEffect(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Improvement 10: Scanlines every 3-4 pixels
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    for (let y = 0; y < this.height; y += 3) {
      ctx.fillRect(0, y, this.width, 1);
    }

    // Improvement 10: Radial gradient vignette
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width / 3,
      this.width / 2, this.height / 2, this.width * 0.8
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}

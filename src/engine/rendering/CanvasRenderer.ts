import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent, HealthComponent, VelocityComponent } from "../types/EngineTypes";
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

    // Improvement 3: Starfield (Drawn first, static background)
    if (gameState?.stars) {
      this.drawStarField(ctx, gameState.stars);
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

    // Render Entities
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (pos && render) {
        // Improvement 20: Subtle motion blur for fast entities
        if (vel && render.trailPositions && render.trailPositions.length > 2) {
          const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);
          if (speed > 200) {
            ctx.save();
            // Draw 2 previous copies
            for (let i = 1; i <= 2; i++) {
              const prevIdx = render.trailPositions.length - 1 - i;
              if (prevIdx >= 0) {
                const prevPos = render.trailPositions[prevIdx];
                ctx.globalAlpha = 0.2 / i;
                this.drawEntity(entity, { ...pos, ...prevPos }, render, world);
              }
            }
            ctx.restore();
          }
        }

        this.drawEntity(entity, pos, render, world);
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
      this.drawShipTrail(ctx, ship.trailPositions);
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    // Improvement 6: Glow for bullets
    const isBullet = world.hasComponent(entity, "Bullet");
    if (isBullet) {
      ctx.shadowColor = "#ffffaa";
      ctx.shadowBlur = 12;
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
      const hue = 30 + (entity % 20); // Stable random hue per particle
      const lightness = 50 + alpha * 30;
      ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
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

    // Improvement 5: Irregular polygonal asteroids
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

    // Improvement 19: Internal cracks/lines
    if (render.internalLines) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      render.internalLines.forEach(line => {
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
      });
      ctx.stroke();
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
  }

  private drawFlash(ctx: CanvasRenderingContext2D, world: World, entity: Entity, size: number): void {
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    if (!ttl) return;
    ctx.globalAlpha = (ttl.remaining / ttl.total) * 0.5;
    ctx.fillStyle = "white";
    ctx.shadowColor = "white";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLine(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.stroke();
  }

  private drawShipTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[]): void {
    // Improvement 2: Trail cyan with alpha fade
    trail.forEach((p, i) => {
      const alpha = (i / trail.length) * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
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

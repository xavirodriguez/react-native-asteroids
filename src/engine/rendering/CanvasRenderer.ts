import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent, TTLComponent, HealthComponent } from "../types/EngineTypes";
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
    if (gameState?.screenShake && gameState.screenShake.framesLeft > 0) {
      shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
      shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Render Entities
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (pos && render) {
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

    // Improvement 2: Ship Trail (Draw BEFORE ship in world space)
    const ship = world.getComponent<ShipComponent>(entity, "Ship");
    if (ship && ship.trail) {
      this.drawShipTrail(ctx, ship.trail, render.size);
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(render.rotation);

    // Improvement 6: Glow for bullets
    const isBullet = world.hasComponent(entity, "Bullet");
    if (isBullet) {
      ctx.shadowColor = "#ffffaa";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
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

    // Improvement 9: Hit Flash (Overlay on top of shape)
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      // Approximate bounds with a square based on size
      const flashSize = render.size * 2.2;
      ctx.fillRect(-flashSize / 2, -flashSize / 2, flashSize, flashSize);
    }

    ctx.restore();
  }

  public drawParticles(world: World): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const entities = world.query("Position", "Render").filter(e => {
      const r = world.getComponent<RenderComponent>(e, "Render");
      return r?.shape === "particle";
    });

    entities.forEach(entity => {
      const pos = world.getComponent<PositionComponent>(entity, "Position")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (!ttl) return;

      const lifeRatio = ttl.remaining / ttl.total;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.globalAlpha = lifeRatio;

      // Improvement 1: Dynamic color (White -> Orange -> Red)
      let hue = 0;
      let lightness = 50;

      if (lifeRatio > 0.8) {
        lightness = 100; // White
      } else if (lifeRatio > 0.4) {
        hue = 30; // Orange
        lightness = 50 + (lifeRatio - 0.4) * 125;
      } else {
        hue = 0; // Red
        lightness = 25 + (lifeRatio / 0.4) * 25;
      }

      // Random hue variation per particle (Improvement 1)
      const hueVariation = (entity * 1337) % 20 - 10;
      ctx.fillStyle = `hsl(${hue + hueVariation}, 100%, ${Math.min(100, lightness)}%)`;

      // Improvement 6: Glow for fresh particles
      if (lifeRatio > 0.8) {
        ctx.shadowColor = "#ffffaa";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      const size = render.size * lifeRatio; // Improvement 1: size shrink
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

    ctx.strokeStyle = render.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = "#333";

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      ctx.strokeStyle = "white";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    }

    ctx.beginPath();
    ctx.moveTo(render.vertices[0].x, render.vertices[0].y);
    for (let i = 1; i < render.vertices.length; i++) {
      ctx.lineTo(render.vertices[i].x, render.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (render.internalLines) {
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      render.internalLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      });
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

  private drawShipTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], shipSize: number): void {
    // Improvement 2: Trail cyan with alpha/size fade (8-12 positions)
    trail.forEach((p, i) => {
      const ratio = i / trail.length;
      const alpha = ratio * 0.4;
      const currentSize = (1 + ratio * (shipSize / 3)) * 0.8; // Improvement 2: size fade

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawStarField(ctx: CanvasRenderingContext2D, stars: any[], world: World): void {
    const shipEntity = world.query("Ship", "Position")[0];
    const shipPos = shipEntity
      ? world.getComponent<PositionComponent>(shipEntity, "Position")
      : { x: this.width / 2, y: this.height / 2 };

    if (!shipPos) return;

    drawStarField(ctx, stars, this.width, this.height, shipPos);
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

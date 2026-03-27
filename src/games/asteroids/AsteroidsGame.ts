import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { WrapSystem } from "../../engine/systems/WrapSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG, type GameStateComponent, type InputState, INITIAL_GAME_STATE, type ShipComponent, type InputComponent, type HealthComponent, type TTLComponent } from "./types/AsteroidTypes";
import { CanvasRenderer } from "../../engine/rendering/CanvasRenderer";
import { SkiaRenderer } from "../../engine/rendering/SkiaRenderer";
import { BlurStyle, Skia } from "@shopify/react-native-skia";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { TouchController } from "../../engine/input/TouchController";
import { getGameState } from "./GameUtils";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../engine/rendering/Renderer";
import { drawAsteroidsShip, drawAsteroidsUfo, asteroidsStarfieldEffect, asteroidsCRTEffect, asteroidsScreenShakeEffect, drawAsteroidsBullet } from "./rendering/AsteroidsCanvasVisuals";
import { drawSkiaShip, drawSkiaUfo, skiaStarfieldEffect, skiaScreenShakeEffect, drawSkiaBullet } from "./rendering/AsteroidsSkiaVisuals";

export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState>
  implements IAsteroidsGame {

  private gameStateSystem: AsteroidGameStateSystem;
  private assetLoader: AssetLoader;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;

  constructor() {
    super({ pauseKey: GAME_CONFIG.KEYS.PAUSE, restartKey: GAME_CONFIG.KEYS.RESTART });
    this.assetLoader = new AssetLoader();
    this.bulletPool = new BulletPool();
    this.particlePool = new ParticlePool();
  }

  public static registerAsteroidsSkiaRenderer(renderer: SkiaRenderer): void {
    renderer.registerShape("triangle", (canvas, paint, render, world, entity) => {
      const size = render.size;
      const input = world.getComponent<InputComponent>(entity, "Input");
      const health = world.getComponent<HealthComponent>(entity, "Health");

      const isInvulnerable = health && health.invulnerableRemaining > 0;
      const blinkOpacity = isInvulnerable
          ? Math.floor(Date.now() / 150) % 2 === 0 ? 0.3 : 1.0
          : 1.0;

      paint.setAlphaf(blinkOpacity);

      if (input?.thrust) {
          const thrusterPath = Skia.Path.Make();
          thrusterPath.moveTo(-5, 3);
          thrusterPath.lineTo(-15, 0);
          thrusterPath.lineTo(-5, -3);
          thrusterPath.close();

          paint.setColor(Skia.Color("#FF4400"));
          paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 5, true));
          canvas.drawPath(thrusterPath, paint);
          paint.setMaskFilter(null);
          paint.setColor(Skia.Color("#FFCC00"));
          canvas.drawPath(thrusterPath, paint);
      }

      const shipPath = Skia.Path.Make();
      shipPath.moveTo(10, 0);
      shipPath.lineTo(-5, 5);
      shipPath.lineTo(-3, 2);
      shipPath.lineTo(-3, -2);
      shipPath.lineTo(-5, -5);
      shipPath.close();

      paint.setColor(Skia.Color("#DDDDDD"));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(shipPath, paint);

      paint.setColor(Skia.Color(render.color));
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(1);
      canvas.drawPath(shipPath, paint);

      paint.setColor(Skia.Color("#FF0000"));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-size / 2, size / 6, size / 6, size / 8), paint);
      canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 6 - size / 8, size / 6, size / 8), paint);
    });

    // Overwrite default circle for bullets to add glow
    renderer.registerShape("circle", (canvas, paint, render, world, entity) => {
      const isBullet = world.hasComponent(entity, "Bullet");
      if (isBullet) {
        paint.setColor(Skia.Color("#FFFF00"));
        paint.setAlphaf(0.3);
        paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 4, true));
        canvas.drawCircle(0, 0, render.size * 3, paint);
        paint.setMaskFilter(null);
        paint.setAlphaf(1.0);
        paint.setColor(Skia.Color("#FFFFFF"));
      } else {
        paint.setColor(Skia.Color(render.color));
      }
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, 0, render.size, paint);
    });

    renderer.registerShape("ufo", (canvas, paint, render) => {
      const size = render.size;
      const color = render.color;
      paint.setColor(Skia.Color(color));
      paint.setAlphaf(0.3);
      paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));
      canvas.drawCircle(0, 0, size, paint);
      paint.setMaskFilter(null);

      paint.setAlphaf(1.0);
      paint.setColor(Skia.Color("#999"));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), paint);

      paint.setColor(Skia.Color(color));
      paint.setStyle(Skia.PaintStyle.Stroke);
      canvas.drawOval(Skia.XYWHRect(-size, -size / 2, size * 2, size), paint);

      paint.setColor(Skia.Color("#00ffff"));
      paint.setAlphaf(0.6);
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawOval(Skia.XYWHRect(-size / 2, -size / 2, size, size / 1.5), paint);

      paint.setColor(Skia.Color("yellow"));
      paint.setAlphaf(1.0);
      canvas.drawCircle(-size / 2, 0, 1.5, paint);
      canvas.drawCircle(0, size / 6, 1.5, paint);
      canvas.drawCircle(size / 2, 0, 1.5, paint);
    });

    renderer.registerShape("flash", (canvas, paint, render, world, entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      const alpha = ttl ? ttl.remaining / ttl.total : 1;
      paint.setColor(Skia.Color("white"));
      paint.setAlphaf(alpha * 0.5);
      paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 20, true));
      canvas.drawCircle(0, 0, render.size, paint);
      paint.setMaskFilter(null);
    });

    renderer.registerBackgroundEffect((canvas, paint, world, width, height) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity
        ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState"))
        : null;

      if (gameState?.stars) {
        const shipEntity = world.query("Ship", "Position")[0];
        const shipPos = shipEntity
          ? world.getComponent<PositionComponent>(shipEntity, "Position")
          : { x: width / 2, y: height / 2 };

        if (!shipPos) return;

        paint.setColor(Skia.Color("white"));
        paint.setStyle(Skia.PaintStyle.Fill);

        gameState.stars.forEach(star => {
          const parallaxX = (star.x - shipPos.x * (0.05 * (star.layer + 1)) + width) % width;
          const parallaxY = (star.y - shipPos.y * (0.05 * (star.layer + 1)) + height) % height;

          const twinkle = 0.8 + Math.sin(star.twinklePhase + Date.now() * 0.005 * star.twinkleSpeed) * 0.2;
          paint.setAlphaf(star.brightness * twinkle);
          canvas.drawRect(Skia.XYWHRect(parallaxX, parallaxY, star.size, star.size), paint);
        });
      }

      // Ship Trails (dots)
      const shipEntities = world.query("Ship", "Position");
      shipEntities.forEach(shipEntity => {
        const ship = world.getComponent<ShipComponent>(shipEntity, "Ship");
        if (ship?.trailPositions) {
          paint.setColor(Skia.Color("cyan"));
          paint.setStyle(Skia.PaintStyle.Fill);
          ship.trailPositions.forEach((p, i) => {
            paint.setAlphaf((i / ship.trailPositions!.length) * 0.4);
            canvas.drawCircle(p.x, p.y, 1.5, paint);
          });
        }
      });
      paint.setAlphaf(1.0);

      // Screen Shake
      if (gameState?.screenShake && gameState.screenShake.duration > 0) {
        const shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
        const shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
        canvas.translate(shakeX, shakeY);
      }
    });
  }

  public static registerAsteroidsRenderer(renderer: CanvasRenderer): void {
    // Register custom shapes
    renderer.registerShape("triangle", (ctx, render, world, entity) => {
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

    });

    // Overwrite default circle for bullets to add glow
    renderer.registerShape("circle", (ctx, render, world, entity) => {
      const isBullet = world.hasComponent(entity, "Bullet");
      if (isBullet) {
        ctx.shadowColor = "#ffffaa";
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = render.color;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
      if (isBullet) {
        ctx.shadowBlur = 0;
      }
    });

    renderer.registerShape("ufo", (ctx, render) => {
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
    });

    renderer.registerShape("flash", (ctx, render, world, entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (!ttl) return;
      ctx.globalAlpha = (ttl.remaining / ttl.total) * 0.5;
      ctx.fillStyle = "white";
      ctx.shadowColor = "white";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, render.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Register visual effects
    renderer.registerBackgroundEffect((ctx, world) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity
        ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState"))
        : null;

      if (gameState?.stars) {
        gameState.stars.forEach((star) => {
          ctx.globalAlpha = star.brightness;
          ctx.fillStyle = "white";
          ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1.0;
      }

      // Ship Trails
      const shipEntities = world.query("Ship", "Position");
      shipEntities.forEach(shipEntity => {
        const ship = world.getComponent<ShipComponent>(shipEntity, "Ship");
        if (ship?.trailPositions) {
          ship.trailPositions.forEach((p, i) => {
            const alpha = (i / ship.trailPositions!.length) * 0.4;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#00ffff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
      ctx.globalAlpha = 1.0;

      // Screen Shake
      if (gameState?.screenShake && gameState.screenShake.duration > 0) {
        const shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
        const shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
        ctx.translate(shakeX, shakeY);
      }
    });

    renderer.registerForegroundEffect((ctx, world, width, height) => {
      const gameStateEntity = world.query("GameState")[0];
      const gameState = gameStateEntity
        ? (world.getComponent<GameStateComponent>(gameStateEntity, "GameState"))
        : null;

      if (gameState?.debugCRT !== false) {
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
      }
    });
  }

  protected registerSystems(): void {
    const DEFAULT_INPUT: InputState = {
      thrust: false, rotateLeft: false, rotateRight: false,
      shoot: false, hyperspace: false
    };

    const ASTEROID_KEYMAP = {
      [GAME_CONFIG.KEYS.THRUST]: "thrust" as const,
      [GAME_CONFIG.KEYS.ROTATE_LEFT]: "rotateLeft" as const,
      [GAME_CONFIG.KEYS.ROTATE_RIGHT]: "rotateRight" as const,
      [GAME_CONFIG.KEYS.SHOOT]: "shoot" as const,
      [GAME_CONFIG.KEYS.HYPERSPACE]: "hyperspace" as const,
    };

    this.inputManager.addController(new KeyboardController<InputState>(ASTEROID_KEYMAP, DEFAULT_INPUT));
    this.inputManager.addController(new TouchController<InputState>());

    const inputSys = new AsteroidInputSystem(this.inputManager, this.bulletPool, this.particlePool);
    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new WrapSystem(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT));
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new AsteroidRenderSystem());
  }

  protected initializeEntities(): void {
    createShip({ world: this.world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
    createGameState({ world: this.world });
    spawnAsteroidWave({ world: this.world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });
  }

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer): void {
    // Canvas-specific registration
    if (renderer.constructor.name === "CanvasRenderer") {
      renderer.registerShape("triangle", drawAsteroidsShip);
      renderer.registerShape("ufo", drawAsteroidsUfo);
      renderer.registerShape("bullet_shape", drawAsteroidsBullet);
      renderer.registerBackgroundEffect("starfield", asteroidsStarfieldEffect);
      renderer.registerBackgroundEffect("screenshake", asteroidsScreenShakeEffect);
      renderer.registerForegroundEffect("crt", asteroidsCRTEffect);
    } else if (renderer.constructor.name === "SkiaRenderer") {
      renderer.registerShape("triangle", drawSkiaShip);
      renderer.registerShape("ufo", drawSkiaUfo);
      renderer.registerShape("bullet_shape", drawSkiaBullet);
      renderer.registerBackgroundEffect("starfield", skiaStarfieldEffect);
      renderer.registerBackgroundEffect("screenshake", skiaScreenShakeEffect);
    }
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState();
  }

  public getGameState(): GameStateComponent {
    return getGameState(this.world);
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }
}

export class NullAsteroidsGame implements IAsteroidsGame {
  private _world = new World();
  public start() {} public stop() {} public pause() {} public resume() {}
  public restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}

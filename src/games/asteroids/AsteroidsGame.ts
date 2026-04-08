import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { UfoSystem } from "./systems/UfoSystem";
import { RenderUpdateSystem } from "../../engine/systems/RenderUpdateSystem";
import { InputStateComponent } from "../../engine/types/EngineTypes";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { BoundarySystem } from "../../engine/systems/BoundarySystem";
import { FrictionSystem } from "../../engine/systems/FrictionSystem";
import { ScreenShakeSystem } from "../../engine/systems/ScreenShakeSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { TransformComponent, VelocityComponent, RenderComponent, FrictionComponent, ScreenShakeComponent, TagComponent, HealthComponent } from "../../engine/types/EngineTypes";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG, type GameStateComponent, type InputState, INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { TouchController } from "../../engine/input/TouchController";
import { InputFrame, EntitySnapshot } from "../../multiplayer/NetTypes";
import { InterpolationBuffer } from "../../multiplayer/InterpolationSystem";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../engine/rendering/Renderer";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState>
  implements IAsteroidsGame {

  private gameStateSystem: AsteroidGameStateSystem;
  private assetLoader: AssetLoader;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private entityInterpolationBuffers = new Map<string, InterpolationBuffer>();
  private serverEntities = new Map<string, number>();

  constructor(config: { isMultiplayer?: boolean } = {}) {
    super({
      pauseKey: GAME_CONFIG.KEYS.PAUSE,
      restartKey: GAME_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer
    });
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    const dt = deltaTime / 1000;
    const ships = this.world.query("Ship", "Transform", "Velocity", "Render");

    ships.forEach((entity) => {
        const tag = this.world.getComponent<TagComponent>(entity, "Tag");
        if (tag && tag.tags.includes("LocalPlayer")) {
            const pos = this.world.getComponent<TransformComponent>(entity, "Transform");
            const vel = this.world.getComponent<VelocityComponent>(entity, "Velocity");
            const render = this.world.getComponent<RenderComponent>(entity, "Render");

            if (pos && vel && render) {
                // Apply same logic as server
                const rotateLeft = input.actions.includes("rotateLeft") || input.axes.rotate_left > 0;
                const rotateRight = input.actions.includes("rotateRight") || input.axes.rotate_right > 0;
                const thrust = input.actions.includes("thrust") || input.axes.thrust > 0;

                if (rotateLeft) render.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * dt;
                if (rotateRight) render.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * dt;
                if (thrust) {
                    vel.dx += Math.cos(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt;
                    vel.dy += Math.sin(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt;
                }

                // Wrapping
                if (pos.x < 0) pos.x = GAME_CONFIG.SCREEN_WIDTH;
                if (pos.x > GAME_CONFIG.SCREEN_WIDTH) pos.x = 0;
                if (pos.y < 0) pos.y = GAME_CONFIG.SCREEN_HEIGHT;
                if (pos.y > GAME_CONFIG.SCREEN_HEIGHT) pos.y = 0;
            }
        }
    });
  }

  public updateFromServer(state: any, localSessionId?: string) {
    if (!this.isMultiplayer || !state) return;

    const currentServerIds = new Set<string>();

    // 1. Buffering snapshots for remote entities
    if (state.players) {
        state.players.forEach((player: any, sessionId: string) => {
            currentServerIds.add(sessionId);
            if (sessionId !== localSessionId) {
                let buffer = this.entityInterpolationBuffers.get(sessionId);
                if (!buffer) {
                    buffer = new InterpolationBuffer(10);
                    this.entityInterpolationBuffers.set(sessionId, buffer);
                }
                buffer.push({
                    tick: state.serverTick,
                    x: player.x,
                    y: player.y,
                    angle: player.angle,
                    timestamp: Date.now()
                });
            }

            let entity = this.serverEntities.get(sessionId);
            if (entity === undefined) {
                entity = this.world.createEntity();
                this.serverEntities.set(sessionId, entity);
                this.world.addComponent(entity, { type: "Transform", x: player.x, y: player.y, rotation: player.angle, scaleX: 1, scaleY: 1 } as TransformComponent);
                this.world.addComponent(entity, {
                    type: "Render",
                    shape: "triangle",
                    size: 10,
                    color: "white",
                    rotation: player.angle,
                    trailPositions: []
                } as RenderComponent);
                this.world.addComponent(entity, { type: "Ship", hyperspaceTimer: 0, hyperspaceCooldownRemaining: 0 } as any);
                const tags = ["Ship"];
                if (sessionId === localSessionId) tags.push("LocalPlayer");
                this.world.addComponent(entity, { type: "Tag", tags } as TagComponent);
                this.world.addComponent(entity, { type: "Health", current: player.lives, max: 3, invulnerableRemaining: 0 } as HealthComponent);
                if (sessionId === localSessionId) {
                    this.world.addComponent(entity, { type: "Velocity", dx: player.velocityX, dy: player.velocityY } as VelocityComponent);
                }
            }

            const pos = this.world.getComponent<any>(entity, "Transform");
            const render = this.world.getComponent<any>(entity, "Render");
            const health = this.world.getComponent<any>(entity, "Health");
            const vel = this.world.getComponent<any>(entity, "Velocity");

            if (sessionId === localSessionId) {
                // Reconciliation logic
                const dx = Math.abs(pos.x - player.x);
                const dy = Math.abs(pos.y - player.y);
                const THRESHOLD = 5;

                if (dx > THRESHOLD || dy > THRESHOLD) {
                    pos.x = player.x;
                    pos.y = player.y;
                }
                if (vel) {
                    vel.dx = player.velocityX;
                    vel.dy = player.velocityY;
                }
                render.rotation = player.angle;
            } else {
                // Interpolation logic
                const buffer = this.entityInterpolationBuffers.get(sessionId);
                const snapshot = buffer?.getAt(Date.now() - 100);
                if (snapshot) {
                    pos.x = snapshot.prev.x + (snapshot.next.x - snapshot.prev.x) * snapshot.alpha;
                    pos.y = snapshot.prev.y + (snapshot.next.y - snapshot.prev.y) * snapshot.alpha;
                    render.rotation = snapshot.prev.angle !== undefined && snapshot.next.angle !== undefined ?
                        snapshot.prev.angle + (snapshot.next.angle - snapshot.prev.angle) * snapshot.alpha : player.angle;
                } else {
                    pos.x = player.x;
                    pos.y = player.y;
                    render.rotation = player.angle;
                }
            }
            if (health) health.current = player.lives;
            render.color = player.alive ? "white" : "rgba(255,0,0,0.5)";
        });
    }

    // 2. Asteroids
    if (state.asteroids) {
        state.asteroids.forEach((asteroid: any, id: string) => {
            currentServerIds.add(id);
            let entity = this.serverEntities.get(id);
            if (entity === undefined) {
                entity = this.world.createEntity();
                this.serverEntities.set(id, entity);
                this.world.addComponent(entity, { type: "Transform", x: asteroid.x, y: asteroid.y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
                this.world.addComponent(entity, { type: "Render", shape: "polygon", size: 30, color: "white", rotation: 0 } as RenderComponent);
                this.world.addComponent(entity, { type: "Asteroid", size: "large" } as any);
                this.world.addComponent(entity, { type: "Tag", tags: ["Asteroid"] } as TagComponent);
            }
            const pos = this.world.getComponent<TransformComponent>(entity, "Transform");
            if (pos) {
                pos.x = asteroid.x;
                pos.y = asteroid.y;
            }
        });
    }

    // 3. Bullets
    if (state.bullets) {
        state.bullets.forEach((bullet: any, id: string) => {
            currentServerIds.add(id);
            let entity = this.serverEntities.get(id);
            if (entity === undefined) {
                entity = this.world.createEntity();
                this.serverEntities.set(id, entity);
                this.world.addComponent(entity, { type: "Transform", x: bullet.x, y: bullet.y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
                this.world.addComponent(entity, { type: "Render", shape: "bullet_shape", size: 2, color: "white", rotation: 0 } as RenderComponent);
                this.world.addComponent(entity, { type: "Bullet" } as any);
                this.world.addComponent(entity, { type: "Tag", tags: ["Bullet"] } as TagComponent);
            }
            const pos = this.world.getComponent<TransformComponent>(entity, "Transform");
            if (pos) {
                pos.x = bullet.x;
                pos.y = bullet.y;
            }
        });
    }

    // 4. Cleanup stale entities
    this.serverEntities.forEach((entity, id) => {
        if (!currentServerIds.has(id)) {
            this.world.removeEntity(entity);
            this.serverEntities.delete(id);
            this.entityInterpolationBuffers.delete(id);
        }
    });
  }

  protected registerSystems(): void {
    // Initialize pools here because super() calls this before the constructor finishes
    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

    // Configure UnifiedInputSystem bindings
    this.unifiedInput.bind("thrust", [GAME_CONFIG.KEYS.THRUST]);
    this.unifiedInput.bind("rotateLeft", [GAME_CONFIG.KEYS.ROTATE_LEFT]);
    this.unifiedInput.bind("rotateRight", [GAME_CONFIG.KEYS.ROTATE_RIGHT]);
    this.unifiedInput.bind("shoot", [GAME_CONFIG.KEYS.SHOOT]);
    this.unifiedInput.bind("hyperspace", [GAME_CONFIG.KEYS.HYPERSPACE]);

    const inputSys = new AsteroidInputSystem(this.bulletPool, this.particlePool);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);
    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.world.addSystem(this.unifiedInput);
    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new FrictionSystem());
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new UfoSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new RenderUpdateSystem()); // Handle rotation/hit flash
    this.world.addSystem(new AsteroidRenderSystem()); // Handle trails
  }

  protected initializeEntities(): void {}

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer): void {
    initializeAsteroidsRenderer(renderer);
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState();
  }

  public getGameState(): GameStateComponent {
    return this.getWorld().getSingleton<GameStateComponent>("GameState") ?? INITIAL_GAME_STATE;
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

}

export class NullAsteroidsGame implements IAsteroidsGame {
  private _world = new World();
  public start() {} public stop() {} public pause() {} public resume() {}
  public async restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}

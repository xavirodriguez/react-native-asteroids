import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type TransformComponent,
  type InputState,
  type InputStateComponent,
  GAME_CONFIG,
} from "../../../engine/types/EngineTypes";
import { createBullet, createParticle } from "../EntityFactory";
import { hapticShoot } from "../../../utils/haptics";
import { BulletPool, ParticlePool } from "../EntityPool";
import { RandomService } from "../../../engine/utils/RandomService";
import { PhysicsUtils } from "../../../engine/utils/PhysicsUtils";

/**
 * System responsible for processing user input and applying it to the ship's state.
 *
 * @remarks
 * This system reads from the UnifiedInputSystem (via InputStateComponent)
 * and applies it to game entities.
 */
export class AsteroidInputSystem extends System {
  /**
   * Creates a new AsteroidInputSystem.
   *
   * @param bulletPool - The pool for creating bullets.
   * @param particlePool - The pool for creating particles.
   */
  constructor(
    private bulletPool: BulletPool,
    private particlePool: ParticlePool,
    private config: typeof GAME_CONFIG = GAME_CONFIG
  ) {
    super();
  }

  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param input - The new input state.
   * @deprecated Use world.getSingleton<InputStateComponent>("InputState") instead.
   */
  public setInput(_input: Partial<InputState>): void {
    // Legacy method, inputs handled by UnifiedInputSystem
  }

  /**
   * Updates ship rotation, velocity, and shooting based on current input state.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  private isMultiplayer = false;

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World, deltaTime: number): void {
    if (this.isMultiplayer) return; // Inputs handled by React hook in multiplayer
    const ships = world.query("Ship", "Input", "Transform", "Velocity", "Render");
    ships.forEach((entity) => this.updateShipEntity({ world, entity, deltaTime }));
  }

  private updateShipEntity(context: { world: World; entity: number; deltaTime: number }): void {
    const { world, entity, deltaTime } = context;
    const input = world.getComponent<InputComponent>(entity, "Input");
    if (!input) return;

    this.updateShipState({ world, input, deltaTime });
    this.processShipActions({ world, entity, input, deltaTime });
  }

  private updateShipState(context: { world: World; input: InputComponent; deltaTime: number }): void {
    const { world, input, deltaTime } = context;
    this.updateShootingCooldown(input, deltaTime);
    this.updateShipInputState({ world, input });
  }

  private processShipActions(context: {
    world: World;
    entity: number;
    input: InputComponent;
    deltaTime: number;
  }): void {
    const { world, entity, input, deltaTime } = context;
    this.handleMovementAndShooting(world, entity, input, deltaTime);
  }

  private handleMovementAndShooting(
    world: World,
    entity: number,
    input: InputComponent,
    deltaTime: number
  ): void {
    const velocity = world.getComponent<VelocityComponent>(entity, "Velocity");
    const render = world.getComponent<RenderComponent>(entity, "Render");
    const position = world.getComponent<TransformComponent>(entity, "Transform");

    if (velocity && render && position) {
      this.applyShipMovement({ world, position, velocity, render, input, deltaTime });
      this.handleShipShooting({ world, position, render, input });
    }
  }

  private updateShootingCooldown(input: InputComponent, deltaTime: number): void {
    if (input.shootCooldownRemaining > 0) {
      input.shootCooldownRemaining -= deltaTime;
    }
  }

  private updateShipInputState(context: { world: World, input: InputComponent }): void {
    const { world, input } = context;
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    if (inputState) {
      input.thrust = inputState.isPressed("thrust");
      input.rotateLeft = inputState.isPressed("rotateLeft");
      input.rotateRight = inputState.isPressed("rotateRight");
      input.shoot = inputState.isPressed("shoot");
      input.hyperspace = inputState.isPressed("hyperspace");
    }
  }

  private applyShipMovement(context: {
    world: World;
    position: TransformComponent;
    velocity: VelocityComponent;
    render: RenderComponent;
    input: InputComponent;
    deltaTime: number;
  }): void {
    const { world, position, velocity, render, input, deltaTime } = context;
    const deltaTimeInSeconds = deltaTime / 1000;

    this.applyRotation({ render, input, deltaTimeInSeconds });
    this.applyThrust({ world, position, velocity, render, input, deltaTimeInSeconds });
    this.applyFriction(velocity, deltaTime);
  }

  private applyRotation(context: {
    render: RenderComponent;
    input: InputComponent;
    deltaTimeInSeconds: number;
  }): void {
    const { render, input, deltaTimeInSeconds } = context;
    if (input.rotateLeft) render.rotation -= this.config.SHIP_ROTATION_SPEED * deltaTimeInSeconds;
    if (input.rotateRight) render.rotation += this.config.SHIP_ROTATION_SPEED * deltaTimeInSeconds;
  }

  private applyThrust(context: {
    world: World;
    position: TransformComponent;
    velocity: VelocityComponent;
    render: RenderComponent;
    input: InputComponent;
    deltaTimeInSeconds: number;
  }): void {
    const { world, position, velocity, render, input, deltaTimeInSeconds } = context;
    if (input.thrust) {
      velocity.dx += Math.cos(render.rotation) * this.config.SHIP_THRUST * deltaTimeInSeconds;
      velocity.dy += Math.sin(render.rotation) * this.config.SHIP_THRUST * deltaTimeInSeconds;

      const gameplayRandom = RandomService.getInstance("gameplay");

      // Improvement 8: Spawn 3-5 small thrust particles
      const particleCount = 3 + Math.floor(gameplayRandom.next() * 3);
      for (let i = 0; i < particleCount; i++) {
        const angle = render.rotation + Math.PI + (gameplayRandom.next() - 0.5) * 0.5;
        const speed = 50 + gameplayRandom.next() * 50;
        createParticle({
          world,
          x: position.x - Math.cos(render.rotation) * 10,
          y: position.y - Math.sin(render.rotation) * 10,
          dx: Math.cos(angle) * speed + velocity.dx * 0.5,
          dy: Math.sin(angle) * speed + velocity.dy * 0.5,
          color: i % 2 === 0 ? "#FF8800" : "#FFFF00",
          ttl: 400,
          size: 1 + gameplayRandom.next() * 2,
        });
      }
    }
  }

  private applyFriction(velocity: VelocityComponent, deltaTime: number): void {
    PhysicsUtils.applyFriction(velocity, this.config.SHIP_FRICTION, deltaTime);
  }

  private handleShipShooting(context: {
    world: World;
    position: TransformComponent;
    render: RenderComponent;
    input: InputComponent;
  }): void {
    const { world, position, render, input } = context;
    const canShoot = input.shoot && input.shootCooldownRemaining <= 0;
    if (canShoot) {
      createBullet({ world, x: position.x, y: position.y, angle: render.rotation });
      input.shootCooldownRemaining = this.config.BULLET_SHOOT_COOLDOWN;
      hapticShoot();
    }
  }
}

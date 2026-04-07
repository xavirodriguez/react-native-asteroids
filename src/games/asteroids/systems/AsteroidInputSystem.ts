import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type TransformComponent,
  type InputState,
  GAME_CONFIG,
} from "../../../types/GameTypes";
import { createBullet, createParticle } from "../EntityFactory";
import { hapticShoot } from "../../../utils/haptics";
import { InputManager } from "../../../engine/input/InputManager";
import { BulletPool, ParticlePool } from "../EntityPool";
import { RandomService } from "../../../engine/utils/RandomService";

/**
 * System responsible for processing user input and applying it to the ship's state.
 *
 * @remarks
 * This system decouples input collection (via {@link InputManager}) from the
 * application of that input to game entities.
 */
export class AsteroidInputSystem extends System {
  /**
   * Creates a new AsteroidInputSystem.
   *
   * @param inputManager - The centralized input manager to poll for state.
   * @param bulletPool - The pool for creating bullets.
   * @param particlePool - The pool for creating particles.
   */
  constructor(
    private inputManager: InputManager,
    private bulletPool: BulletPool,
    private particlePool: ParticlePool
  ) {
    super();
  }

  /**
   * Manually sets the input state. Useful for mobile touch controls.
   * Proxies to the underlying {@link InputManager}.
   *
   * @param input - The new input state.
   */
  public setInput(input: Partial<InputState>): void {
    this.inputManager.setInputs(input);
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

    this.updateShipState(input, deltaTime);
    this.processShipActions({ world, entity, input, deltaTime });
  }

  private updateShipState(input: InputComponent, deltaTime: number): void {
    this.updateShootingCooldown(input, deltaTime);
    this.updateShipInputState(input);
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
    const position = world.getComponent<PositionComponent>(entity, "Position");

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

  private updateShipInputState(input: InputComponent): void {
    const currentInputs = this.inputManager.getCombinedInputs();
    input.thrust = currentInputs.thrust;
    input.rotateLeft = currentInputs.rotateLeft;
    input.rotateRight = currentInputs.rotateRight;
    input.shoot = currentInputs.shoot;
  }

  private applyShipMovement(context: {
    world: World;
    position: PositionComponent;
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
    if (input.rotateLeft) render.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * deltaTimeInSeconds;
    if (input.rotateRight) render.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * deltaTimeInSeconds;
  }

  private applyThrust(context: {
    world: World;
    position: PositionComponent;
    velocity: VelocityComponent;
    render: RenderComponent;
    input: InputComponent;
    deltaTimeInSeconds: number;
  }): void {
    const { world, position, velocity, render, input, deltaTimeInSeconds } = context;
    if (input.thrust) {
      velocity.dx += Math.cos(render.rotation) * GAME_CONFIG.SHIP_THRUST * deltaTimeInSeconds;
      velocity.dy += Math.sin(render.rotation) * GAME_CONFIG.SHIP_THRUST * deltaTimeInSeconds;
      this.spawnThrustParticles({ world, position, velocity, rotation: render.rotation });
    }
  }

  private spawnThrustParticles(params: {
    world: World;
    position: PositionComponent;
    velocity: VelocityComponent;
    rotation: number;
  }): void {
    const { world, position, velocity, rotation } = params;
    const particleCount = RandomService.nextInt(3, 6);
    for (let i = 0; i < particleCount; i++) {
      const angle = rotation + Math.PI + (RandomService.next() - 0.5) * 0.5;
      const speed = RandomService.nextRange(50, 100);
      createParticle({
        world,
        x: position.x - Math.cos(rotation) * 10,
        y: position.y - Math.sin(rotation) * 10,
        dx: Math.cos(angle) * speed + velocity.dx * 0.5,
        dy: Math.sin(angle) * speed + velocity.dy * 0.5,
        color: i % 2 === 0 ? "#FF8800" : "#FFFF00",
        ttl: 400,
        size: RandomService.nextRange(1, 3),
        pool: this.particlePool,
      });
    }
  }

  private applyFriction(velocity: VelocityComponent, deltaTime: number): void {
    const frictionFactor = Math.pow(GAME_CONFIG.SHIP_FRICTION, deltaTime / (1000 / 60));
    velocity.dx *= frictionFactor;
    velocity.dy *= frictionFactor;
  }

  private handleShipShooting(context: {
    world: World;
    position: PositionComponent;
    render: RenderComponent;
    input: InputComponent;
  }): void {
    const { world, position, render, input } = context;
    const canShoot = input.shoot && input.shootCooldownRemaining <= 0;
    if (canShoot) {
      createBullet({ world, x: position.x, y: position.y, angle: render.rotation, pool: this.bulletPool });
      input.shootCooldownRemaining = GAME_CONFIG.BULLET_SHOOT_COOLDOWN;
      hapticShoot();
    }
  }
}

import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type PositionComponent,
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
  public update(world: World, deltaTime: number): void {
    const ships = world.query("Ship", "Input", "Position", "Velocity", "Render");
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
    const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
    const render = world.getComponent<RenderComponent>(entity, "Render");
    const pos = world.getComponent<PositionComponent>(entity, "Position");

    if (vel && render && pos) {
      this.applyShipMovement({ world, pos, vel, render, input, deltaTime });
      this.handleShipShooting({ world, pos, render, input });
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
    pos: PositionComponent;
    vel: VelocityComponent;
    render: RenderComponent;
    input: InputComponent;
    deltaTime: number;
  }): void {
    const { world, pos, vel, render, input, deltaTime } = context;
    const dt = deltaTime / 1000;

    this.applyRotation({ render, input, dt });
    this.applyThrust({ world, pos, vel, render, input, dt });
  }

  private applyRotation(context: {
    render: RenderComponent;
    input: InputComponent;
    dt: number;
  }): void {
    const { render, input, dt } = context;
    if (input.rotateLeft) render.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * dt;
    if (input.rotateRight) render.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * dt;
  }

  private applyThrust(context: {
    world: World;
    pos: PositionComponent;
    vel: VelocityComponent;
    render: RenderComponent;
    input: InputComponent;
    dt: number;
  }): void {
    const { world, pos, vel, render, input, dt } = context;
    if (input.thrust) {
      vel.dx += Math.cos(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt;
      vel.dy += Math.sin(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt;

      // Improvement 8: Spawn 3-5 small thrust particles
      const particleCount = RandomService.nextInt(3, 6);
      for (let i = 0; i < particleCount; i++) {
        const angle = render.rotation + Math.PI + (RandomService.next() - 0.5) * 0.5;
        const speed = RandomService.nextRange(50, 100);
        createParticle({
          world,
          x: pos.x - Math.cos(render.rotation) * 10,
          y: pos.y - Math.sin(render.rotation) * 10,
          dx: Math.cos(angle) * speed + vel.dx * 0.5,
          dy: Math.sin(angle) * speed + vel.dy * 0.5,
          color: i % 2 === 0 ? "#FF8800" : "#FFFF00",
          ttl: 400,
          size: RandomService.nextRange(1, 3),
          pool: this.particlePool,
        });
      }
    }
  }


  private handleShipShooting(context: {
    world: World;
    pos: PositionComponent;
    render: RenderComponent;
    input: InputComponent;
  }): void {
    const { world, pos, render, input } = context;
    const canShoot = input.shoot && input.shootCooldownRemaining <= 0;
    if (canShoot) {
      createBullet({ world, x: pos.x, y: pos.y, angle: render.rotation, pool: this.bulletPool });
      input.shootCooldownRemaining = GAME_CONFIG.BULLET_SHOOT_COOLDOWN;
      hapticShoot();
    }
  }
}

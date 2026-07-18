import { System, World } from "../../../index";
import { TransformComponent, VelocityComponent } from "../../../index";
import { InputComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { PlayerBulletPool } from "../EntityPool";
import { createPlayerBullet } from "../EntityFactory";

const InputUtils = {
  isPressed(inputState: { buttons: Record<string, boolean> }, button: string): boolean {
    return !!inputState.buttons[button];
  },
  getAxis(inputState: { axes: Record<string, number> }, axis: string): number {
    return inputState.axes[axis] || 0;
  }
};

/**
 * System that handles player input and movement.
 */
export class SpaceInvadersInputSystem extends System<SpaceInvadersComponentRegistry> {
  private bulletPool: PlayerBulletPool;
  private config?: SpaceInvadersConfig;

  constructor(bulletPool: PlayerBulletPool) {
    super();
    this.bulletPool = bulletPool;
  }

  private isMultiplayer = false;

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    if (this.isMultiplayer) return;
    const inputState = world.getSingleton("InputState");
    const entities = world.query("Player", "Input", "Transform", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent(entity, "Input");
      const pos = world.getComponent(entity, "Transform");
      const vel = world.getComponent(entity, "Velocity");

      if (input && pos && vel) {
        // 1. Cálculos fuera de la mutación
        let nextMoveLeft = input.moveLeft;
        let nextMoveRight = input.moveRight;
        let nextShoot = input.shoot;
        let nextShootCooldownRemaining = input.shootCooldownRemaining;

        // Sync input component with manager
        if (inputState) {
          nextMoveLeft = InputUtils.isPressed(inputState, "moveLeft");
          nextMoveRight = InputUtils.isPressed(inputState, "moveRight");
          nextShoot = InputUtils.isPressed(inputState, "shoot");

          const horizontal = InputUtils.getAxis(inputState, "horizontal");
          if (horizontal < -0.35) nextMoveLeft = true;
          if (horizontal > 0.35) nextMoveRight = true;
        }

        // Apply movement
        let moveX = 0;
        if (nextMoveLeft) moveX -= 1;
        else if (nextMoveRight) moveX += 1;
        const targetDx = moveX * this.config!.PLAYER_SPEED;

        // Handle shooting timer
        if (nextShootCooldownRemaining > 0) {
          nextShootCooldownRemaining -= deltaTime;
        }

        if (nextShoot && nextShootCooldownRemaining <= 0) {
          // Check if there is already a player bullet
          const activeBullets = world.query("PlayerBullet");
          if (activeBullets.length === 0) {
            // Estructural: fuera de mutación
            createPlayerBullet(world, pos.x, pos.y - 10, this.bulletPool);
            nextShootCooldownRemaining = this.config!.PLAYER_SHOOT_COOLDOWN;
          }
        }

        // 2. Aplicar mutaciones si han cambiado los valores
        if (input.moveLeft !== nextMoveLeft ||
            input.moveRight !== nextMoveRight ||
            input.shoot !== nextShoot ||
            input.shootCooldownRemaining !== nextShootCooldownRemaining) {
          world.mutateComponent(entity, "Input", i => {
            i.moveLeft = nextMoveLeft;
            i.moveRight = nextMoveRight;
            i.shoot = nextShoot;
            i.shootCooldownRemaining = nextShootCooldownRemaining;
          });
        }

        if (vel.vx !== targetDx) {
          world.mutateComponent(entity, "Velocity", v => {
            v.vx = targetDx;
          });
        }
      }
    });
  }
}

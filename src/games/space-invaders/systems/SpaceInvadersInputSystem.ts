import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, InputStateComponent } from "../../../engine/types/EngineTypes";
import { InputComponent } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { PlayerBulletPool } from "../EntityPool";
import { createPlayerBullet } from "../EntityFactory";
import { InputUtils } from "../../../engine/utils/ComponentUtils";

/**
 * System that handles player input and movement.
 */
export class SpaceInvadersInputSystem extends System {
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

  public update(world: World, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    if (this.isMultiplayer) return;
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    const entities = world.query("Player", "Input", "Transform", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input");
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (input && pos && vel) {
        let moveLeft = input.moveLeft;
        let moveRight = input.moveRight;
        let shoot = input.shoot;
        let shootCooldownRemaining = input.shootCooldownRemaining;

        // Sync input component with manager
        if (inputState) {
          moveLeft = InputUtils.isPressed(inputState, "moveLeft");
          moveRight = InputUtils.isPressed(inputState, "moveRight");
          shoot = InputUtils.isPressed(inputState, "shoot");

          const horizontal = InputUtils.getAxis(inputState, "horizontal");
          if (horizontal < -0.35) moveLeft = true;
          if (horizontal > 0.35) moveRight = true;
        }

        // Apply movement
        let moveX = 0;
        if (moveLeft) moveX -= 1;
        else if (moveRight) moveX += 1;
        const targetDx = moveX * this.config!.PLAYER_SPEED;

        // Handle shooting timer
        if (shootCooldownRemaining > 0) {
          shootCooldownRemaining -= deltaTime;
        }

        let didShoot = false;
        if (shoot && shootCooldownRemaining <= 0) {
          // Check if there is already a player bullet
          const activeBullets = world.query("PlayerBullet");
          if (activeBullets.length === 0) {
            createPlayerBullet(world, pos.x, pos.y - 10, this.bulletPool);
            shootCooldownRemaining = this.config!.PLAYER_SHOOT_COOLDOWN;
            didShoot = true;
          }
        }

        // Mutaciones seguras mediante mutateComponent
        if (input.moveLeft !== moveLeft ||
            input.moveRight !== moveRight ||
            input.shoot !== shoot ||
            input.shootCooldownRemaining !== shootCooldownRemaining) {
          world.mutateComponent<InputComponent>(entity, "Input", i => {
            i.moveLeft = moveLeft;
            i.moveRight = moveRight;
            i.shoot = shoot;
            i.shootCooldownRemaining = shootCooldownRemaining;
          });
        }

        if (vel.dx !== targetDx) {
          world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
            v.dx = targetDx;
          });
        }
      }
    });
  }
}

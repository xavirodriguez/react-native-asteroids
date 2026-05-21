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
        // Sync input component with manager
        if (inputState) {
          input.moveLeft = InputUtils.isPressed(inputState, "moveLeft");
          input.moveRight = InputUtils.isPressed(inputState, "moveRight");
          input.shoot = InputUtils.isPressed(inputState, "shoot");

          const horizontal = InputUtils.getAxis(inputState, "horizontal");
          if (horizontal < -0.35) input.moveLeft = true;
          if (horizontal > 0.35) input.moveRight = true;
        }

        // Apply movement
        let moveX = 0;
        if (input.moveLeft) moveX -= 1;
        else if (input.moveRight) moveX += 1;
        vel.dx = moveX * this.config.PLAYER_SPEED;

        // Handle shooting
        if (input.shootCooldownRemaining > 0) {
          input.shootCooldownRemaining -= deltaTime;
        }

        if (input.shoot && input.shootCooldownRemaining <= 0) {
          // Check if there is already a player bullet
          const activeBullets = world.query("PlayerBullet");
          if (activeBullets.length === 0) {
            createPlayerBullet(world, pos.x, pos.y - 10, this.bulletPool);
            input.shootCooldownRemaining = this.config.PLAYER_SHOOT_COOLDOWN;
          }
        }
      }
    });
  }
}

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
        const mutableInput = world.getMutableComponent<InputComponent>(entity, "Input")!;
        const mutableVel = world.getMutableComponent<VelocityComponent>(entity, "Velocity")!;

        // Sync input component with manager
        if (inputState) {
          mutableInput.moveLeft = InputUtils.isPressed(inputState, "moveLeft");
          mutableInput.moveRight = InputUtils.isPressed(inputState, "moveRight");
          mutableInput.shoot = InputUtils.isPressed(inputState, "shoot");

          const horizontal = InputUtils.getAxis(inputState, "horizontal");
          if (horizontal < -0.35) mutableInput.moveLeft = true;
          if (horizontal > 0.35) mutableInput.moveRight = true;
        }

        // Apply movement
        let moveX = 0;
        if (mutableInput.moveLeft) moveX -= 1;
        else if (mutableInput.moveRight) moveX += 1;
        mutableVel.dx = moveX * this.config!.PLAYER_SPEED;

        // Handle shooting
        if (mutableInput.shootCooldownRemaining > 0) {
          mutableInput.shootCooldownRemaining -= deltaTime;
        }

        if (mutableInput.shoot && mutableInput.shootCooldownRemaining <= 0) {
          // Check if there is already a player bullet
          const activeBullets = world.query("PlayerBullet");
          if (activeBullets.length === 0) {
            createPlayerBullet(world, pos.x, pos.y - 10, this.bulletPool);
            mutableInput.shootCooldownRemaining = this.config!.PLAYER_SHOOT_COOLDOWN;
          }
        }
      }
    });
  }
}

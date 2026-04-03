import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { InputManager } from "../../../engine/input/InputManager";
import { TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, InputState, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { PlayerBulletPool } from "../EntityPool";
import { createPlayerBullet } from "../EntityFactory";

/**
 * System that handles player input and movement.
 */
export class SpaceInvadersInputSystem extends System {
  private inputManager: InputManager<InputState>;
  private bulletPool: PlayerBulletPool;

  constructor(inputManager: InputManager<InputState>, bulletPool: PlayerBulletPool) {
    super();
    this.inputManager = inputManager;
    this.bulletPool = bulletPool;
  }

  public update(world: World, deltaTime: number): void {
    const inputs = this.inputManager.getCombinedInputs();
    const entities = world.query("Player", "Input", "Transform", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input");
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (input && pos && vel) {
        // Sync input component with manager
        input.moveLeft = inputs.moveLeft;
        input.moveRight = inputs.moveRight;
        input.shoot = inputs.shoot;

        // Apply movement
        let moveX = 0;
        if (input.moveLeft) moveX -= 1;
        if (input.moveRight) moveX += 1;
        vel.dx = moveX * GAME_CONFIG.PLAYER_SPEED;

        // Handle shooting
        if (input.shootCooldownRemaining > 0) {
          input.shootCooldownRemaining -= deltaTime;
        }

        if (input.shoot && input.shootCooldownRemaining <= 0) {
          // Check if there is already a player bullet
          const activeBullets = world.query("PlayerBullet");
          if (activeBullets.length === 0) {
            createPlayerBullet(world, pos.x, pos.y - 10, this.bulletPool);
            input.shootCooldownRemaining = GAME_CONFIG.PLAYER_SHOOT_COOLDOWN;
          }
        }
      }
    });
  }
}

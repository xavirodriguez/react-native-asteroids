import { System, type World } from "../ecs-world"
import { type PositionComponent, type VelocityComponent, GAME_CONFIG } from "../../types/GameTypes"

export class MovementSystem extends System {
  update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity")

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position")!
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!

      pos.x += (vel.dx * deltaTime) / 1000
      pos.y += (vel.dy * deltaTime) / 1000

      // Screen wrapping
      if (pos.x < 0) pos.x = GAME_CONFIG.SCREEN_WIDTH
      if (pos.x > GAME_CONFIG.SCREEN_WIDTH) pos.x = 0
      if (pos.y < 0) pos.y = GAME_CONFIG.SCREEN_HEIGHT
      if (pos.y > GAME_CONFIG.SCREEN_HEIGHT) pos.y = 0
    })
  }
}

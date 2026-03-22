import { System, World } from "../core/World"

/**
 * System responsible for updating entity positions based on their velocity.
 */
export class MovementSystem extends System {
  constructor(private screenWidth: number, private screenHeight: number) {
    super()
  }

  public update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity")

    entities.forEach((entity) => {
      const pos = world.getComponent<{x: number, y: number}>(entity, "Position")
      const vel = world.getComponent<{dx: number, dy: number}>(entity, "Velocity")
      const render = world.getComponent<{trailPositions?: {x: number, y: number}[]}>(entity, "Render")

      if (pos && vel) {
        if (render && render.trailPositions) {
          render.trailPositions.push({ x: pos.x, y: pos.y })
          if (render.trailPositions.length > 10) {
            render.trailPositions.shift()
          }
        }

        const dt = deltaTime / 1000
        pos.x += vel.dx * dt
        pos.y += vel.dy * dt

        this.wrapPosition(pos)
      }
    })
  }

  private wrapPosition(pos: {x: number, y: number}): void {
    if (pos.x < 0) pos.x = this.screenWidth
    else if (pos.x > this.screenWidth) pos.x = 0

    if (pos.y < 0) pos.y = this.screenHeight
    else if (pos.y > this.screenHeight) pos.y = 0
  }
}

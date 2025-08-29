import { System, type World } from "../ecs-world"
import type { TTLComponent } from "../../types/GameTypes"

export class TTLSystem extends System {
  update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL")
    const entitiesToRemove: number[] = []

    ttlEntities.forEach((entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL")!
      ttl.remaining -= deltaTime

      if (ttl.remaining <= 0) {
        entitiesToRemove.push(entity)
      }
    })

    entitiesToRemove.forEach((entity) => {
      world.removeEntity(entity)
    })
  }
}

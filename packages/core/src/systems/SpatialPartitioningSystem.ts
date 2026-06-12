import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export class SpatialPartitioningSystem extends System<any> {
  public update(world: World<any>, _deltaTime: number): void {
      // Spatial logic
  }
}

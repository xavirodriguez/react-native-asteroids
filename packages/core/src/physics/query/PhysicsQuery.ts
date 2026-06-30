import { World } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { Shape } from "../shapes/Shapes";

export class PhysicsQuery {
  public static pointCast(world: World, x: number, y: number): Entity[] {
    // Basic implementation placeholder
    return [];
  }

  public static shapeCast(world: World, shape: Shape, x: number, y: number): Entity[] {
    // Basic implementation placeholder
    return [];
  }
}

import { World } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { Shape } from "../shapes/Shapes";

export class PhysicsQuery {
  public static pointCast(world: World<any>, x: number, y: number): Entity[] {
    // Basic implementation placeholder
    return [];
  }

  public static shapeCast(world: World<any>, shape: Shape, x: number, y: number): Entity[] {
    // Basic implementation placeholder
    return [];
  }
}

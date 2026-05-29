import { Entity } from "../ecs/Entity";

export interface GameCommand<TType extends string = string, TPayload = Record<string, unknown>> {
  type: TType;
  entityId: Entity;
  tick: number;
  payload?: TPayload;
}

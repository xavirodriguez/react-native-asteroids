import {
  CoreComponentRegistry,
  Component,
  Entity,
  BlueprintDefinition
} from "../../../engine/legacy/proxy";

export interface AsteroidComponent extends Component {
  type: "Asteroid";
  size: "large" | "medium" | "small";
}

export interface ShipComponent extends Component {
  type: "Ship";
  score: number;
}

export type AsteroidsComponentRegistry = CoreComponentRegistry & {
  Asteroid: AsteroidComponent;
  Ship: ShipComponent;
};

export type AsteroidsEventRegistry = {
  "ship:damaged": { shipEntity: Entity; damageAmount: number };
  "ship:destroyed": { shipEntity: Entity; finalScore: number };
  "asteroid:split": { parentEntity: Entity; size: "large" | "medium" | "small" };
  "asteroid:destroyed": { entity: Entity; points: number };
  "score:changed": { newScore: number };
};

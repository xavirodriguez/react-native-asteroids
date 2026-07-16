import { Component } from "../../../ecs/Component";

/** @public */
export interface LootTableComponent extends Component {
  type: "LootTable";
  tableId: string;
}

/** @public */
export interface PowerUpComponent extends Component {
  type: "PowerUp";
  powerUpType: string;
}

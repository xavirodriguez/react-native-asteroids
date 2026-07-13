import { Component } from "../../../ecs/Component";

export interface LootTableComponent extends Component {
    type: "LootTable";
    tableId: string;
}

export interface PowerUpComponent extends Component {
    type: "PowerUp";
    powerUpType: string;
}

import { Component } from "@tiny-aster/core";

export interface LootTableComponent extends Component {
  type: "LootTable";
  tableId: string;
}

export interface PowerUpComponent extends Component {
  type: "PowerUp";
  powerUpType: string;
}

import { Component } from "../../../ecs/Component";

export interface GameStateComponent extends Component {
  type: "GameState";
  score: number;
  level: number;
  lives: number;
  isGameOver: boolean;
}

export interface InputComponent extends Component {
  type: "Input";
  rotateLeft: boolean;
  rotateRight: boolean;
  thrust: boolean;
  shoot: boolean;
  hyperspace: boolean;
  rotationAmount: number;
}

export interface UfoComponent extends Component {
  type: "Ufo";
  size: "large" | "small";
}

export interface ShipComponent extends Component {
  type: "Ship";
  sessionId: string;
}

export interface BulletComponent extends Component {
  type: "Bullet";
  ownerId?: string;
}

export interface InputState {
    rotateLeft: boolean;
    rotateRight: boolean;
    thrust: boolean;
    shoot: boolean;
}

export const INITIAL_GAME_STATE: GameStateComponent = {
  type: "GameState",
  score: 0,
  level: 1,
  lives: 3,
  isGameOver: false
};

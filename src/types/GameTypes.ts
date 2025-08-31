// Base ECS Types
export type ComponentType = string
export type Entity = number

export interface Component {
  type: ComponentType
}

// Game Components
export interface PositionComponent extends Component {
  type: "Position"
  x: number
  y: number
}

export interface VelocityComponent extends Component {
  type: "Velocity"
  dx: number
  dy: number
}

export interface RenderComponent extends Component {
  type: "Render"
  shape: "triangle" | "circle" | "line"
  size: number
  color: string
  rotation: number
}
/*
Los componentes Collider definen la forma de un objeto para los propósitos de colisiones físicas. 
Un collider, el cual es invisible, necesita no estar con la misma forma exacta que el mesh del objeto y de hecho, 
una aproximación a menudo es más eficiente e indistinguible en el juego.
*/
export interface ColliderComponent extends Component {
  type: "Collider"
  radius: number
}

export interface HealthComponent extends Component {
  type: "Health"
  current: number
  max: number
}

export interface InputComponent extends Component {
  type: "Input"
  thrust: boolean
  rotateLeft: boolean
  rotateRight: boolean
  shoot: boolean
}

export interface TTLComponent extends Component {
  type: "TTL"
  remaining: number
}

export interface AsteroidComponent extends Component {
  type: "Asteroid"
  size: "large" | "medium" | "small"
}

export interface GameStateComponent extends Component {
  type: "GameState"
  lives: number
  score: number
  level: number
  asteroidsRemaining: number
}

// Game Constants
export const GAME_CONFIG = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  SHIP_THRUST: 200,
  SHIP_ROTATION_SPEED: 3,
  BULLET_SPEED: 300,
  BULLET_TTL: 2000,
}

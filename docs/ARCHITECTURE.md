# Overall Architecture and Project Structure of react-native-asteroids

## Project Overview

The react-native-asteroids codebase is a modern implementation of the classic Asteroids arcade game built with **Expo** and **React Native**, using an **Entity-Component-System (ECS)** architecture pattern. The project is configured for cross-platform deployment across iOS, Android, and web platforms.

## Build Configuration

### Expo Configuration
The project uses Expo Router with file-based navigation and is configured with the new React Native architecture enabled. The build setup includes:

### Key Configuration Features:
- **Entry Point**: Uses `expo-router/entry` as the main entry point.
- **New Architecture**: React Native's new architecture is enabled (`newArchEnabled: true` in `app.json`).
- **Metro Bundler**: Uses Metro for web bundling with static output.
- **Cross-platform Support**: iOS (with tablet support), Android (edge-to-edge), and web platforms.
- **Styling**: Uses Tailwind CSS v4 with PostCSS.

## File Organization

### Root Directory Structure

The codebase follows a clear separation of concerns:

- **`app/`** - Expo Router entry points and layouts.
- **`src/`** - Core game logic (ECS implementation).
- **`components/`** - React presentation components.
- **`constants/`** - Application constants.
- **`styles/`** - Global styles.
- **`docs/`** - Technical documentation (English and Spanish).
- **`lib/`** - Utility functions.

### Source Code Organization (`src/`)

The core game logic is organized into three main directories:

#### `src/game/` - Game Engine
- **`ecs-world.ts`** - Core ECS implementation (World, System, Entity).
- **`AsteroidsGame.ts`** - Main game orchestrator and state controller.
- **`EntityFactory.ts`** - Factory functions for entity creation.
- **`systems/`** - Game systems directory (Input, Movement, Collision, TTL, GameState).

#### `src/types/` - Type Definitions
Contains all TypeScript interfaces and game constants (`GameTypes.ts`).

#### `src/input/` - Input Management
Abstract input controller pattern for cross-platform input handling (`InputController.ts`).

## ECS System Implementation

### Core ECS Architecture

The ECS implementation is a pure, minimalist design with three core abstractions:

#### 1. **World Class** - Central Registry
The `World` class manages all entities, components, and systems.

```typescript
export class World {
  private entities = new Set<Entity>()
  private components = new Map<ComponentType, Map<Entity, Component>>()
  private systems: System[] = []
  private nextEntityId = 1

  createEntity(): Entity {
    const id = this.nextEntityId++
    this.entities.add(id)
    return id
  }

  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
    }
    this.components.get(type)!.set(entity, component)
  }

  query(...componentTypes: ComponentType[]): Entity[] {
    return Array.from(this.entities).filter((entity) =>
      componentTypes.every((type) => this.components.get(type)?.has(entity)),
    )
  }
}
```

**Key Features:**
- Entities are unique numeric IDs.
- Components are stored in nested Maps for O(1) access: `Map<ComponentType, Map<Entity, Component>>`.
- Systems execute sequentially in registration order.
- Query system filters entities by component composition.

#### 2. **System Abstract Class** - Processing Logic
All game systems extend this base class and implement the `update` method.

#### 3. **Component Interfaces** - Pure Data
Nine component types are defined as TypeScript interfaces in `GameTypes.ts`:

| Component | Purpose |
|-----------|---------|
| `PositionComponent` | Spatial location (x, y). |
| `VelocityComponent` | Movement (dx, dy). |
| `RenderComponent` | Visual representation (shape, size, color, rotation). |
| `ColliderComponent` | Collision detection radius. |
| `InputComponent` | Player input state. |
| `HealthComponent` | Life system. |
| `TTLComponent` | Time-to-live for bullets. |
| `AsteroidComponent` | Asteroid metadata (size). |
| `GameStateComponent` | Global game state (score, lives, level, isGameOver). |

### Systems Implementation

The game runs five systems in a specific execution order:

1. **InputSystem** - Processes keyboard/touch input and applies it to ship components.
2. **MovementSystem** - Updates entity positions based on velocity and handles screen wrapping.
3. **CollisionSystem** - Handles circular collision detection and resolution (e.g., splitting asteroids).
4. **TTLSystem** - Removes entities when their time-to-live expires (e.g., bullets).
5. **GameStateSystem** - Manages asteroid waves, score, and game over conditions.

## Game Orchestration

### AsteroidsGame Class

The main game class implements the `IAsteroidsGame` interface and coordinates the ECS world and game loop.

```typescript
export class AsteroidsGame implements IAsteroidsGame {
  private world: World
  private lastTime = 0
  private isRunning = false
  private isPaused = false
  private listeners = new Set<UpdateListener>();

  constructor() {
    this.world = new World()
    this.setupSystems()
    this.initializeGame()
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    if (!this.isPaused) {
      this.world.update(deltaTime)
    }

    this.notifyListeners();
    this.gameLoopId = requestAnimationFrame(this.gameLoop)
  }

  subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

**Key Responsibilities:**
- Initializes the ECS world and systems.
- Runs the game loop at ~60 FPS using `requestAnimationFrame`.
- Manages high-level game state (start, stop, pause, resume, restart).
- Provides an event-based subscription mechanism via `subscribe(listener: UpdateListener)`.
- Exposes game state for React components.

## React Integration Layer

### Application Entry Point (`app/index.tsx`)

The main app component bridges React and the game engine using an event-driven strategy.

```typescript
export default function App() {
  const [game, setGame] = useState<AsteroidsGame | null>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const newGame = new AsteroidsGame();
    setGame(newGame);
    newGame.start();

    // Subscribe to game updates instead of using a 16ms interval polling
    const unsubscribe = newGame.subscribe((updatedGame) => {
      forceUpdate({}); // Trigger re-render for game entities
    });

    return () => {
      unsubscribe();
      newGame.stop();
    };
  }, []);

  // ...
}
```

**Synchronization Strategy:**
- Game runs in its own loop using `requestAnimationFrame`.
- React UI synchronizes with the game engine by subscribing to updates.
- Uses `forceUpdate({})` to trigger re-renders since game entities mutate by reference.

### React Components

#### GameRenderer - Visual Output
Queries the ECS world and renders entities using `react-native-svg`. It utilizes the `G` component for complex entities like the ship, including visual effects like a pulsating core and thrusters.

#### GameUI - HUD Display
Shows lives, score, and level from the game state, and handles the "Game Over" overlay.

#### GameControls - Input Interface
Platform-aware controls: touch controls for mobile and instructions for web (keyboard support is handled globally by `InputSystem`).

## Game Configuration

Game constants (screen dimensions, speeds, TTL) are centralized in `GAME_CONFIG` within `src/types/GameTypes.ts` for easy tuning.

# Overall Architecture and Project Structure of react-native-asteroids

## Project Overview

The react-native-asteroids codebase is a modern implementation of the classic Asteroids arcade game built with **Expo** and **React Native**, using an **Entity-Component-System (ECS)** architecture pattern. The project is configured for cross-platform deployment across iOS, Android, and web platforms.

## Build Configuration

### Expo Configuration
The project uses Expo Router with file-based navigation and is configured with the new React Native architecture enabled.

### Key Configuration Features:
- **Entry Point**: Uses `expo-router/entry` as the main entry point.
- **New Architecture**: React Native's new architecture is enabled (`newArchEnabled: true` in `app.json`).
- **Metro Bundler**: Uses Metro for web bundling with static output.
- **Cross-platform Support**: iOS (with tablet support), Android (edge-to-edge), and web platforms.

## File Organization

### Root Directory Structure

The codebase follows a clear separation of concerns:

- **`app/`** - Expo Router entry points and layouts.
- **`src/`** - Core game logic (ECS implementation) and engine systems.
- **`components/`** - React presentation components.
- **`constants/`** - Application constants.
- **`styles/`** - Global styles and theme definitions.
- **`docs/`** - Technical documentation (English and Spanish).
- **`lib/`** - Utility functions.

### Source Code Organization (`src/`)

The core game logic is organized into three main directories:

#### `src/game/` - Game Engine
- **`ecs-world.ts`** - Core ECS implementation managing entities, components, and systems. Includes structural versioning for performance optimization.
- **`AsteroidsGame.ts`** - Main game orchestrator. It manages the game loop and provides a subscription API for UI synchronization.
- **`EntityFactory.ts`** - Factory functions for creating pre-configured entities (Ship, Asteroid, Bullet).
- **`systems/`** - Individual game systems implementing specific logic (Movement, Collision, etc.).

#### `src/types/` - Type Definitions
- **`GameTypes.ts`** - Contains all TypeScript interfaces for components and global game constants (`GAME_CONFIG`).

#### `src/input/` - Input Management
- **`InputController.ts`** - Abstract input controller pattern for cross-platform input handling (Keyboard for Web, Touch for Mobile).

## ECS System Implementation

### Core ECS Architecture

The ECS implementation is a pure design with three core abstractions:

#### 1. **World Class** - Central Registry
The `World` class (`src/game/ecs-world.ts`) manages all entities, components, and systems:
- **Entities**: Unique numeric IDs.
- **Components**: Stored in nested Maps for O(1) access.
- **Component Index**: Maintains a `Map<ComponentType, Set<Entity>>` to optimize entity queries.
- **Structural Versioning**: A `version` property that increments on structural changes (entity/component addition/removal) to help React determine when to re-query entities.
- **Query System**: Efficiently filters entities by component composition, prioritizing the rarest component types for performance.

#### 2. **System Abstract Class** - Processing Logic
All game systems extend this base class and implement the `update(world, deltaTime)` method. Systems are executed sequentially in the order they were registered.

#### 3. **Component Interfaces** - Pure Data
Components are defined as pure TypeScript interfaces in `src/types/GameTypes.ts`:

| Component | Purpose | Key Properties |
|-----------|---------|----------------|
| `PositionComponent` | Spatial location | `x, y` |
| `VelocityComponent` | Movement physics | `dx, dy` |
| `RenderComponent` | Visual representation | `shape, size, color, rotation` |
| `ColliderComponent` | Collision detection | `radius` |
| `InputComponent` | Player input state | `thrust, rotateLeft, rotateRight, shoot` |
| `HealthComponent` | Life and durability | `current, max, invulnerableRemaining` |
| `TTLComponent` | Time-to-live (bullets) | `remaining` |
| `AsteroidComponent` | Asteroid metadata | `size: "large" | "medium" | "small"` |
| `GameStateComponent` | Global game state | `lives, score, level, isGameOver` |

### Systems Implementation

The game runs five systems in a specific sequential order within `AsteroidsGame`:

1. **InputSystem**: Captures keyboard/touch input and applies it to the ship's rotation and velocity. It also handles bullet spawning with a cooldown.
2. **MovementSystem**: Updates entity positions based on velocity and handles screen wrapping logic via the `wrapPosition` method.
3. **CollisionSystem**: Detects and resolves collisions using an O(n²) brute-force algorithm optimized with squared distance calculations (avoiding expensive `Math.sqrt` calls). It handles asteroid splitting and ship damage with a temporary invulnerability period.
4. **TTLSystem**: Manages the lifespan of temporary entities like bullets, removing them when their time-to-live expires.
5. **GameStateSystem**: Monitors ship health and asteroid counts to manage level progression, wave spawning, and game-over state.

## Game Orchestration

### AsteroidsGame Class

The `AsteroidsGame` class coordinates the ECS world and the game loop:
- **Game Loop**: Runs at ~60 FPS using `requestAnimationFrame`.
- **Subscription API**: Implements an `UpdateListener` pattern (`subscribe` method) allowing the React UI to receive notifications on every frame update.
- **Input Bridge**: Provides the `setInput` method to pass mobile touch inputs into the `InputSystem`.
- **State Management**: Provides high-level controls for `start`, `stop`, `pause`, `resume`, and `restart` (which uses `world.clear()`).

## React Integration Layer

### Application Entry Point (`app/index.tsx`)

The main app component bridges React and the game engine:
- **Event-Driven Sync**: Uses the `subscribe` method of `AsteroidsGame` to synchronize game state.
- **Force Update**: Triggers a re-render using a `forceUpdate` hook to reflect changes in the mutated ECS components.
- **Lifecycle Management**: Initializes the game instance within a `useEffect` and ensures proper cleanup on unmount.

### React Components

#### GameRenderer - Visual Output
Queries the ECS world for renderable entities and renders them using `react-native-svg` components (Svg, Polygon, Circle, etc.).
- **Optimization**: Uses `useMemo` with `world.version` as a dependency to avoid unnecessary re-querying of the ECS world.
- **Visuals**: Includes complex rendering logic for the ship (thrust effects, pulsating core).

#### GameUI - HUD Display
Displays the current lives, score, and level. It also renders the "GAME OVER" overlay and the "RESTART" button when applicable.

#### GameControls - Input Interface
Platform-aware controls that render touch buttons for mobile devices and display keyboard instructions for the web platform.

## Design Considerations

- **Collision Efficiency**: Uses squared distance comparisons (`dx*dx + dy*dy < radiusSum*radiusSum`) to minimize computational overhead.
- **Grace Period**: The `HealthComponent.invulnerableRemaining` property provides a temporary invulnerability window after the ship is hit, preventing instant loss of multiple lives.
- **Cross-Platform**: The logic is strictly separated from the presentation layer, allowing the same ECS engine to run on all Expo-supported platforms.
- **Clean Code**: Functions are kept small and focused, following the Single Responsibility Principle.

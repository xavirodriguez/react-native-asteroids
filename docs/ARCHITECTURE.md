# Overall Architecture and Project Structure of react-native-asteroids

## Project Overview

The react-native-asteroids codebase is a modern implementation of the classic Asteroids arcade game built with **Expo** and **React Native**, using an **Entity-Component-System (ECS)** architecture pattern. The project is configured for cross-platform deployment across iOS, Android, and web platforms.

## Build Configuration

### Expo Configuration
The project uses Expo Router with file-based navigation and is configured with the new React Native architecture enabled. The build setup includes:

### Key Configuration Features:
- **Entry Point**: Uses `expo-router/entry` as the main entry point.
- **New Architecture**: React Native's new architecture is enabled (`newArchEnabled: true`).
- **Metro Bundler**: Uses Metro for web bundling with static output.
- **Cross-platform Support**: iOS (with tablet support), Android (edge-to-edge), and web platforms.
- **Styling**: Tailwind CSS v4 with PostCSS configuration.

## File Organization

### Root Directory Structure

The codebase follows a clear separation of concerns:

- **`app/`** - Expo Router entry points and layouts.
- **`src/`** - Core game logic (ECS implementation).
- **`components/`** - React presentation components.
- **`constants/`** - Application constants.
- **`styles/`** - Global styles and Tailwind configuration.
- **`docs/`** - Technical documentation (Spanish and English).
- **`lib/`** - Utility functions.

### Source Code Organization (`src/`)

The core game logic is organized into three main directories:

#### `src/game/` - Game Engine
- **`ecs-world.ts`** - Core ECS implementation (World and System base classes).
- **`AsteroidsGame.ts`** - Main game orchestrator and state controller.
- **`EntityFactory.ts`** - Factory functions for entity creation.
- **`systems/`** - Game systems directory.

#### `src/types/` - Type Definitions
- **`GameTypes.ts`** - Contains all TypeScript interfaces for components and game constants.

#### `src/input/` - Input Management
- **`InputController.ts`** - Abstract input controller pattern for cross-platform input handling (Keyboard and Touch).

## ECS System Implementation

### Core ECS Architecture

The ECS implementation is a pure, minimalist design with three core abstractions:

#### 1. **World Class** - Central Registry
The `World` class manages all entities, components, and systems:
- Entities are unique numeric IDs.
- Components are stored in nested Maps for O(1) access: `Map<ComponentType, Map<Entity, Component>>`.
- Systems execute sequentially in registration order.
- Query system filters entities by component composition.

#### 2. **System Abstract Class** - Processing Logic
All game systems extend this base class, implementing an `update` method.

#### 3. **Component Interfaces** - Pure Data
Nine component types defined as TypeScript interfaces:

| Component | Purpose |
|-----------|---------|
| `PositionComponent` | Spatial location (x, y) |
| `VelocityComponent` | Movement (dx, dy) |
| `RenderComponent` | Visual representation (shape, size, color, rotation) |
| `ColliderComponent` | Circular collision detection radius |
| `InputComponent` | Player input state (thrust, rotation, shoot) |
| `HealthComponent` | Life system (current, max) |
| `TTLComponent` | Time-to-live for bullets |
| `AsteroidComponent` | Asteroid metadata (size) |
| `GameStateComponent` | Global game state (lives, score, level, game over status) |

### Systems Implementation

The game runs five systems in a specific execution order:

1. **InputSystem** - Captures keyboard/touch input and applies to ship velocity and rotation. Handles bullet spawning with cooldown.
2. **MovementSystem** - Updates entity positions based on velocity with screen wrapping logic.
3. **CollisionSystem** - Brute-force O(n²) collision detection. Handles ship-asteroid damage and bullet-asteroid splitting.
4. **TTLSystem** - Removes entities when their time-to-live expires (primarily for bullets).
5. **GameStateSystem** - Manages asteroid waves, level progression, and detects game over conditions.

### Entity Factory Pattern

Three factory functions in `EntityFactory.ts` create pre-configured entities:
- `createShip`: Creates the player ship with necessary components.
- `createAsteroid`: Creates asteroids of various sizes with random velocities.
- `createBullet`: Creates projectiles fired by the ship.

## Game Orchestration

### AsteroidsGame Class

The main game class coordinates the ECS world and game loop:
- Initializes the ECS world and systems.
- Runs the game loop at ~60 FPS using `requestAnimationFrame`.
- Manages high-level game state (start, stop, pause, resume, restart).
- Provides a subscription mechanism (`UpdateListener`) for UI synchronization.
- Exposes methods for mobile input control.

## React Integration Layer

### Application Entry Point (`app/index.tsx`)

The main app component bridges React and the game engine:
- **Synchronization Strategy**: The game runs in its own loop. React UI updates are triggered via a **subscription** to the game's update cycle. When the game updates, it notifies listeners, which then trigger a React re-render using a `forceUpdate` pattern to reflect the mutated state of ECS entities.

### React Components

Components are built using React Native primitives and styled with a combination of `StyleSheet.create` for component-specific styles and Tailwind CSS v4 for global design tokens.

#### GameRenderer - Visual Output
Queries the ECS world and renders entities using SVG via `react-native-svg`.
- The ship renderer features advanced visual effects including a pulsating core and thruster flames when active.

#### GameUI - HUD Display
Shows lives, score, and level. Renders a "GAME OVER" overlay and restart button when the match ends.

#### GameControls - Input Interface
Platform-aware controls:
- **Web**: Displays instructions for keyboard use (Arrow Keys and Space).
- **Mobile**: Provides touchable buttons for rotation, thrust, and firing.

## Game Configuration

Game constants are centralized in `GAME_CONFIG` within `src/types/GameTypes.ts` for easy tuning of ship thrust, rotation speed, bullet velocity, and more.

## Architecture Strengths

- **Clean Separation**: Distinct boundaries between game logic (ECS), state management, and presentation (React).
- **Type Safety**: Extensive use of TypeScript interfaces and generics.
- **Cross-platform**: Built-in support for multiple input methods and platform-agnostic rendering.
- **Scalability**: The ECS pattern allows for easy addition of new components and systems without tightly coupling existing logic.

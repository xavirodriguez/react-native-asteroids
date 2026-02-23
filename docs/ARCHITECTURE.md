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

## File Organization

### Root Directory Structure

The codebase follows a clear separation of concerns:

- **`app/`** - Expo Router entry points and layouts.
- **`src/`** - Core game logic (ECS implementation) and engine systems.
- **`components/`** - React presentation components.
- **`constants/`** - Application constants.
- **`styles/`** - Global styles and theme definitions.
- **`docs/`** - Technical documentation.
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
The `World` class manages all entities, components, and systems:
- **Entities**: Unique numeric IDs.
- **Components**: Stored in nested Maps for O(1) access.
- **Structural Versioning**: A `version` property that increments on structural changes to help React determine when to re-query entities.
- **Query System**: Efficiently filters entities by component composition.

#### 2. **System Abstract Class** - Processing Logic
All game systems extend this base class and implement the `update` method.

#### 3. **Component Interfaces** - Pure Data
The system defines components as TypeScript interfaces, including:
- `PositionComponent`, `VelocityComponent`, `RenderComponent`, `ColliderComponent`, `InputComponent`, `HealthComponent` (with invulnerability state), `TTLComponent`, `AsteroidComponent`, and `GameStateComponent`.

### Systems Implementation

The game runs systems in a specific sequential order:

1. **InputSystem**: Captures input and applies it to the ship's rotation and velocity.
2. **MovementSystem**: Updates positions based on velocity and handles screen wrapping.
3. **CollisionSystem**: Detects and resolves collisions using squared distance calculations for efficiency. It handles asteroid splitting and ship damage with a grace period.
4. **TTLSystem**: Removes entities when their lifespan expires.
5. **GameStateSystem**: Manages level progression, wave spawning, and game-over state synchronization.

## Game Orchestration

### AsteroidsGame Class

The `AsteroidsGame` class coordinates the ECS world and the game loop:
- **Game Loop**: Runs at ~60 FPS using `requestAnimationFrame`.
- **Subscription API**: Allows the React UI to subscribe to frame updates instead of using polling.
- **Input Bridge**: Provides methods to pass mobile touch inputs into the ECS world.

## React Integration Layer

### Application Entry Point (`app/index.tsx`)

The main app component bridges React and the game engine:
- **Event-Driven Sync**: Uses the `subscribe` method of `AsteroidsGame` to synchronize game state with React state.
- **Force Update**: Triggers re-renders to reflect changes in the mutated ECS components.

### React Components

#### GameRenderer - Visual Output
Queries the ECS world and renders entities using `react-native-svg` components. It utilizes `useMemo` with `world.version` to optimize rendering performance.

#### GameUI - HUD Display
Shows lives, score, and level. Handles the "GAME OVER" state and provides a "RESTART" trigger.

#### GameControls - Input Interface
Platform-aware controls (Touch buttons for mobile, instructions for web).

## Styling and Configuration

- **Styling**: Standard React Native `StyleSheet` for components, with Tailwind CSS v4 configuration for global web styles.
- **Constants**: Game mechanics (thrust, speed, cooldowns) are centralized in `GAME_CONFIG`.

## Design Considerations

- **Collision Efficiency**: Uses squared distance calculations to avoid expensive square root operations.
- **Invulnerability**: The ship receives a temporary grace period after damage to prevent rapid life loss.
- **Cross-Platform**: Decoupled engine logic allows for consistent behavior across Web and Native platforms.

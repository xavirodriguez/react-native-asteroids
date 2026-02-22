# Asteroids Game Architecture

This document provides a comprehensive overview of the architecture and project structure of the React Native Asteroids game.

## Overview

The game is built using a modern implementation of the classic Asteroids arcade game using **Expo** and **React Native**. It follows the **Entity-Component-System (ECS)** architecture pattern, which ensures a clean separation of concerns between data and logic.

## Project Structure

- **`app/`**: Expo Router entry points and layouts.
- **`src/`**: Core game logic and engine.
  - **`game/`**: ECS implementation, systems, and entity factories.
  - **`input/`**: Platform-agnostic input handling.
  - **`types/`**: Type definitions and game configurations.
- **`components/`**: React presentation components for rendering and UI.
- **`docs/`**: Technical documentation (available in Spanish and English).

## Entity-Component-System (ECS)

The core engine is based on a minimalist ECS implementation:

### 1. World (`src/game/ecs-world.ts`)
The `World` class acts as the central registry for:
- **Entities**: Unique numeric IDs.
- **Components**: Data structures attached to entities.
- **Systems**: Logic that processes entities with specific components.

### 2. Components (`src/types/GameTypes.ts`)
Components are pure data structures. Key components include:
- `Position`: Spatial location (x, y).
- `Velocity`: Movement vectors (dx, dy).
- `Render`: Visual properties (shape, size, color).
- `Collider`: Circular collision boundaries.
- `Health`: Lives and invulnerability state.
- `GameState`: Global game progress.

### 3. Systems (`src/game/systems/`)
Systems implement the game logic and run sequentially in each frame:
1. **InputSystem**: Processes user input and applies forces to the player ship.
2. **MovementSystem**: Updates positions based on velocity and handles screen wrapping.
3. **CollisionSystem**: Detects and resolves collisions between entities (e.g., bullets hitting asteroids, ship hitting asteroids). Includes an invulnerability period for the ship.
4. **TTLSystem**: Manages the lifespan of temporary entities like bullets.
5. **GameStateSystem**: Manages levels, score, and game-over conditions. It also synchronizes ship health with the global game state.

## React Integration

The game engine runs independently of React using a `requestAnimationFrame` loop. Synchronization with the React UI is achieved via:
- **Subscription Model**: React components subscribe to game updates.
- **State Mirroring**: Essential game state (lives, score, level) is mirrored in the `GameStateComponent` for easy access by the UI.
- **SVG Rendering**: Game entities are rendered using `react-native-svg` for cross-platform compatibility.

## Build and Tools

- **Framework**: Expo (React Native).
- **Navigation**: Expo Router.
- **Styling**: Tailwind CSS v4.
- **Testing**: Jest with `jest-expo`.
- **Linting**: ESLint with TypeScript support.
- **New Architecture**: Enabled by default for performance.

## Key Features

- **Cross-platform**: Single codebase for iOS, Android, and Web.
- **Invulnerability**: The ship receives a grace period after being hit to prevent instant loss of multiple lives.
- **Event-driven UI**: Efficient synchronization between the high-frequency game loop and React rendering.

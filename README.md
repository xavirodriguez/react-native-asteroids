# React Native Asteroids & Retro Arcade

A high-performance, deterministic arcade engine built with React Native, ECS, and dual-renderer support (Canvas & Skia).

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo Go (for mobile testing)

### Installation
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start the client (Expo)
npm start

# Start the server (Colyseus)
cd server
npm install
npm run dev
```

## 🏗️ Architecture Overview

The project is divided into three main layers:

1.  **Core Engine (`src/engine`)**: A custom ECS (Entity Component System) designed for determinism and high performance.
    -   **World & Systems**: Manages entity lifecycles and logic updates.
    -   **Physics**: SAT-based collision detection and 2D dynamics.
    -   **Rendering**: Abstract interface for Canvas (Web/Mobile) and Skia (High-perf Native).
    -   **Audio**: Global AudioSystem with semantic event bridging.

2.  **Games (`src/games`)**: Specific implementations for each arcade title.
    -   **Asteroids**: Fully featured with multiplayer (Delta/Binary sync).
    -   **Flappy Bird**: procedural generation and infinite scroll.
    -   **Pong**: Local, AI, and experimental Online modes.
    -   **Space Invaders**: Swarm movement logic and power-up system.

3.  **Services (`src/services`)**: Global logic for progression and meta-game.
    -   **PlayerProfile**: Manages XP, levels, and persistent stats.
    -   **DailyChallenge**: Date-based deterministic seed generation.
    -   **Leaderboard**: Interaction with the global ranking server.

## 📊 Feature Status

For a detailed breakdown of implementation progress, see [docs/FEATURE_STATUS.md](./docs/FEATURE_STATUS.md).

## 🛠️ Testing

```bash
# Run client tests
npm test

# Run server tests
cd server
npm test
```

## 📜 License
MIT

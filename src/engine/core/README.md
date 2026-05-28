# TinyAsterEngine Core (ECS)

The core of the engine is based on an **Entity-Component-System (ECS)** architecture designed to help support performance, simulation consistency, and network synchronization under typical conditions.

## 🏗️ Fundamental Building Blocks

### 1. World
The central registry. Stores entities and components. Manages their lifecycle and provides `Queries` for systems to access data.
*   **Versioning**: Tracks `structureVersion` (structural changes) and `stateVersion` (component data changes) intended to help optimize rendering and synchronization processes.

### 2. Entity
A simple unique numeric identifier. Entities do not contain logic; they act as keys to associate components.

### 3. Component
Data structures (POJOs). They represent state (position, health, velocity).
*   **Recommendation**: It is recommended that they do not contain functions or complex logic to help facilitate serialization (`World.snapshot()`).

### 4. System
Contains execution logic. Systems iterate over groups of entities (filtered by components) and mutate their state.
*   **Pipeline**: Systems are executed in predefined phases (Input, Simulation, Collision, Presentation).

## 🔄 The GameLoop

The engine uses a **Fixed Timestep / Variable Rendering** scheme:
1.  **Update (Logic)**: Oriented towards a fixed frequency (60Hz). Aims to help maintain consistency in physics and game rules.
2.  **Render (Presentation)**: Executes according to the environment's refresh rate. Uses an interpolation factor (`alpha`) intended to help smooth visual motion between simulation ticks.

## 🛡️ Recommended Practices

1.  **Authorized Mutation**: It is recommended to use `world.mutateComponent()` or `world.mutateSingleton()` as the primary method for modifying data. This is designed to allow the engine to track version changes and manage rendering state consistently.
2.  **Iterator Safety**: During a system's `update`, structural changes (creating/destroying entities or adding/removing components) should typically be deferred via the `WorldCommandBuffer`. This aims to avoid inconsistencies when iterating over active queries.
3.  **Simulation Consistency**: To support reproducibility, it is recommended to avoid using external time or randomness sources (such as `Math.random()` or `Date.now()`) within Systems. Instead, use `world.gameplayRandom` and `world.tick`.

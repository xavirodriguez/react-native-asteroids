# React-ECS Synchronization - Technical Documentation

## Overview

The synchronization between **React** (a declarative UI framework) and the **ECS** (an imperative game engine) is a key architectural challenge in this project.

- **React**: Re-renders based on immutable state changes.
- **ECS**: Modifies entities and components by reference (in-place mutation) for performance.
- **Challenge**: The world state changes constantly without automatically notifying React.

## Synchronization Architecture in app/index.tsx

### Initialization and Subscription

The synchronization uses an event-driven model that notifies React whenever the game engine completes an update frame. This replaces an earlier polling-based approach using `setInterval`.

```typescript
useEffect(() => {
  const newGame = new IAsteroidsGame();
  setGame(newGame);
  newGame.start();

  // Subscribe to game frame updates
  const unsubscribe = newGame.subscribe((updatedGame) => {
    setGameState(updatedGame.getGameState());
    forceUpdate({}); // Triggers the React re-render cycle
  });

  return () => {
    unsubscribe();
    newGame.stop();
  };
}, []);
```

**Benefits**:
- **Perfect Sync**: The UI is updated immediately after the game loop processes a frame.
- **Reduced Overhead**: No redundant timers or polling intervals.

### The Force Update Pattern

```typescript
const [, forceUpdate] = useState({});
// ...
forceUpdate({});
```

**Why it is used**:
- The ECS world modifies components **in-place** to avoid the high allocation cost of immutable state in the hot path.
- Since the references don't change, React's standard `setState` checks would skip the update.
- `forceUpdate({})` provides a way to explicitly tell React that the data it depends on (the `World` instance) has been mutated.

## Bidirectional Data Flow

### React → ECS (Input)

User interactions with the React UI are passed into the ECS world via the `IAsteroidsGame` interface:

```typescript
// GameControls component
const handleThrust = (pressed: boolean) => {
  game.setInput(pressed, false, false, false);
};

// IAsteroidsGame.setInput
setInput(thrust, ...) {
  // InputSystem receives the new state in its next update cycle
  this.inputSystem.setInput(thrust, ...);
}
```

**Characteristics**:
- **Latency**: Very low (direct function call).
- **Threading**: Single main thread (standard React Native).

### ECS → React (State Visualization)

The React UI visualizes the state produced by the ECS:

```typescript
// App.tsx
const gameState = game.getGameState(); // Query ECS
setGameState(gameState); // Triggers re-render with new data
```

**Data Pipeline**:
1. **ECS Systems**: Mutate component data (`Position`, `Render`, `GameState`).
2. **Subscription Notification**: Triggers at the end of `gameLoop`.
3. **React State Update**: `App` component re-renders.
4. **UI Components**: `GameRenderer` and `GameUI` re-render to reflect the new state.

## Performance Analysis

### Optimized Rendering Loop

Each `forceUpdate({})` initiates the following cascade:
- `App` re-render
- `GameUI` re-render (shows updated lives, score, level)
- `GameRenderer` re-render
  - `useMemo` checks `world.version` (O(1))
  - If structural change occurred, `world.query` is executed (O(M))
  - `renderables.map` generates `EntityRenderer` components
  - `EntityRenderer` fetches latest component data
  - Memoized sub-renderers (`AsteroidRenderer`, etc.) skip re-render if data (primitives) is unchanged

### Identified Optimization Strategies

1. **Unified Sync Loop**: The `subscribe` model eliminates the "double loop" problem where the UI and engine drift apart.
2. **Selective Rendering**: Memoization at the individual entity level ensures the actual SVG updates are as minimal as possible.
3. **World Versioning**: Structural version tracking in the `World` class avoids expensive queries on frames where no entities were added or removed.

## Design Decisions and Trade-offs

- **Mutable State vs. React Hooks**: We chose mutable ECS state over pure React hooks for the game loop to achieve consistent 60 FPS performance without excessive garbage collection.
- **Reference Passing**: Passing the `World` object as a prop to components allows for deep inspection of entities while keeping the component tree flat and manageable.

## Conclusions

The current synchronization model in `app/index.tsx` is a robust solution for a high-frequency game engine. While it uses an imperative "force update" pattern, it integrates seamlessly with React's rendering lifecycle and provides excellent performance for the Asteroids game.

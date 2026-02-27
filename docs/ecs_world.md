# ECS World - Technical Documentation

## Overview

The module `src/game/ecs-world.ts` implements the core of the **Entity-Component-System (ECS)** pattern used by the Asteroids game. It provides the fundamental abstractions to manage entities, components, and systems in a decoupled and performant manner.

## ECS Architecture

### Key Concepts

- **Entity**: A unique numerical ID (`Entity = number`) representing a game object.
- **Component**: Pure data structure without logic (`Component` interface).
- **System**: Logic that processes entities that possess specific components (`System` abstract class).

The `World` class acts as a central registry that coordinates these three abstractions.

## World Class API

### Initialization

```typescript
constructor();
```

**Initial State**:
- `entities: Set<Entity>` - Set of active entity IDs.
- `components: Map<ComponentType, Map<Entity, Component>>` - Primary storage for component data.
- `componentIndex: Map<ComponentType, Set<Entity>>` - Optimized index for fast queries.
- `version: number = 0` - Structural version counter, used for React optimization.

### Entity Management

#### `createEntity(): Entity`
Generates a new entity with a unique, auto-incremented ID. Increments the world's `version`.

- **Complexity**: O(1)
- **Usage**: `const ship = world.createEntity();`

#### `removeEntity(entity: Entity): void`
Removes an entity and all its associated components from the world. Increments the world's `version`.

- **Cleanup Process**:
  1. Remove entity's data from all component maps.
  2. Remove entity's reference from the component index.
  3. Delete the entity from the active set.
- **Complexity**: O(C) where C is the number of component types.

#### `getAllEntities(): Entity[]`
Returns a snapshot array of all active entities in the world.

- **Complexity**: O(N) where N is the total number of entities.

#### `clear(): void`
Resets the entire world, removing all entities and components. Systems remain registered. Increments the world's `version`.

### Component Management

#### `addComponent<T extends Component>(entity: Entity, component: T): void`
Attaches a component to an entity. Overwrites any existing component of the same type on that entity. Increments the world's `version`.

- **Storage**: Updates both the primary component map and the component index.
- **Complexity**: O(1)

#### `getComponent<T extends Component>(entity: Entity, type: ComponentType): T | undefined`
Retrieves a component instance from an entity.

- **Complexity**: O(1) double hash lookup.

#### `removeComponent(entity: Entity, type: ComponentType): void`
Removes a specific component from an entity. Increments the world's `version`.

- **Complexity**: O(1)

### Query System

#### `query(...componentTypes: ComponentType[]): Entity[]`
Finds all entities that possess all of the specified component types.

- **Optimization**: The query system uses the `componentIndex` to quickly find candidate entities. It automatically selects the rarest component type in the query to minimize the number of iterations.
- **Complexity**: O(M) where M is the number of entities possessing the rarest component in the requested set.
- **Usage**:
  ```typescript
  const renderables = world.query("Position", "Render");
  ```

### System Management

#### `addSystem(system: System): void`
Registers a system to be updated by the world. Systems are executed in the order they are added.

#### `update(deltaTime: number): void`
Executes the `update` method on all registered systems in sequence.

- **Invariants**: Sequential execution (not parallel), consistent `deltaTime` across all systems in a single frame.

## Performance and Structural Versioning

The `World` class includes a `version` property that increments on any structural change (entity or component addition/removal). This is crucial for performance optimization in the React rendering layer:

```tsx
const renderables = useMemo(
  () => world.query("Position", "Render"),
  [world.version] // Only re-calculate if the world structure changed
);
```

## Abstract System Class

### Contract
All systems must implement the `update` method:
```typescript
abstract update(world: World, deltaTime: number): void;
```

### Typical Implementation Pattern
1. Query relevant entities.
2. Iterate through entities.
3. Retrieve components using `getComponent`.
4. Apply game logic and mutate component data in-place.

## Design Considerations and Constraints

- **Single Threaded**: The ECS implementation is designed for a single-threaded JavaScript environment and is not thread-safe.
- **Garbage Collection**: To minimize GC pressure, the `clear()` method can be used for full state resets instead of re-instantiating the `World`.
- **Reference Mutation**: Components are mutated by reference. While this is efficient for the engine, it requires manual triggers for React re-renders (using `forceUpdate` or stable state updates).
- **No Messaging Bus**: Systems currently communicate by reading/writing shared component data.

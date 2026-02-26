# Rendering System - Technical Documentation

## Overview

The rendering system implements a clear separation between game logic and visual representation, using React as a presentation layer on top of the ECS engine.

## Rendering Architecture

### GameRenderer Component

The `GameRenderer` (`components/GameRenderer.tsx`) acts as the bridge between the ECS `World` and the visual SVG representation:

```typescript
// Component Properties
interface GameRendererProps {
  world: World;
}

// Entity Query for renderable entities
const renderables = useMemo(
  () => world.query("Position", "Render"),
  [world.version] // Optimization: Re-query only on structural changes
);
```

### ECS Query Optimization

The rendering uses the ECS query system to fetch only entities that possess both `Position` and `Render` components. To avoid expensive O(N) queries on every frame, the result is memoized based on the world's `version` property, which increments whenever entities or components are added or removed.

## Entity-Specific Renderers

To further optimize performance and maintain clean code, the `GameRenderer` delegates the actual drawing of each entity to specialized, memoized sub-renderers.

### Specialized Renderers

1. **ShipRenderer**: Handles the complex player ship shape, including a pulsating central core and a thrust effect.
2. **AsteroidRenderer**: Renders asteroids as circles with a fixed fill and a dynamic stroke color.
3. **BulletRenderer**: Draws projectiles as small circles.
4. **LineRenderer**: A generic renderer for line segments.

### Performance Pattern

Sub-renderers like `AsteroidRenderer` are wrapped in `React.memo` and receive only primitive values (`x`, `y`, `size`, `color`) as props:

```typescript
const AsteroidRenderer: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = memo(({ x, y, size, color }) => (
  <Circle cx={x} cy={y} r={size} fill="#999" stroke={color} strokeWidth="2" />
));
```

This ensures that React only re-renders the specific SVG elements whose data has changed, even though the parent `GameRenderer` re-renders every frame.

## SVG Coordinate System

Each entity's position and rotation are transformed from ECS world space to SVG space:

```typescript
// Conversion in EntityRenderer
const rotationDegrees = (render.rotation * 180) / Math.PI;
const transform = `translate(${pos.x}, ${pos.y}) rotate(${rotationDegrees})`;
```

**Note**: Internal game logic uses radians for rotation, while `react-native-svg` requires degrees.

## Integration with the Game Loop

The `GameRenderer` is synchronized with the game loop via the subscription model in `App.tsx`:
1. **Game Frame Completes**: The `AsteroidsGame` instance notifies its listeners.
2. **Subscription Callback**: The `App` component calls `forceUpdate({})`.
3. **React Re-render**: `GameRenderer` re-executes, fetching the latest component values from the `World` instance and updating the SVG tree.

## Performance and Constraints

- **Cross-Platform**: The use of `react-native-svg` and standard React Native components ensures the rendering logic works consistently across iOS, Android, and Web.
- **Complexity**: O(R) where R is the number of renderable entities.
- **Memory**: The system re-creates the JSX elements on every frame, but React's virtual DOM diffing and the specialized memoized renderers minimize the actual updates to the underlying platform's view hierarchy.

## Security and Edge Cases

- **Missing Components**: The `EntityRenderer` uses guard clauses to ensure an entity still has both `Position` and `Render` components before attempting to render it.
- **Viewport Boundaries**: The SVG viewport is fixed at `GAME_CONFIG.SCREEN_WIDTH` by `GAME_CONFIG.SCREEN_HEIGHT`.
- **Z-Order**: In SVG, the draw order is determined by the order of elements in the array. Since the ECS `query` doesn't guarantee a specific order, layering is implicitly based on the order of entities in the world.

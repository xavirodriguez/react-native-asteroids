# Sincronización React-ECS - Documentación Técnica

## Descripción del Problema

La sincronización entre **React** (modelo declarativo) y **ECS** (modelo imperativo) presenta desafíos únicos:

- **React**: Re-renderiza basado en cambios de estado inmutables
- **ECS**: Modifica entidades y componentes por referencia directa
- **Challenge**: El World ECS cambia sin notificar a React

## Arquitectura de Sincronización en App.tsx

### Inicialización del Game Engine

```typescript
// Línea 17: Referencia mutable al juego
const gameRef = useRef<AsteroidsGame | null>(null);

// Líneas 19-24: Inicialización en useEffect
useEffect(() => {
  const game = new AsteroidsGame(); // Instancia ECS independiente
  gameRef.current = game;
  game.start(); // Inicia game loop nativo (requestAnimationFrame)

  return () => {
    game.stop(); // Cleanup: detiene RAF loop
    gameRef.current = null;
  };
}, []); // Dependency array vacía = mount/unmount únicamente
```

**Patrón utilizado**: `useRef` para mantener referencia **estable** al game engine sin causar re-renders.

### Sistema de Polling Temporal

#### Timer de Sincronización UI

```typescript
// Líneas 25-30: Interval de sincronización a 60Hz
const uiUpdateInterval = setInterval(() => {
  if (gameRef.current) {
    setGameState(gameRef.current.getGameState()); // Pull state del ECS
    forceUpdate({}); // Forzar re-render de componentes
  }
}, 16); // 16ms ≈ 60 FPS
```

**Análisis del intervalo 16ms**:

- **Frecuencia**: 62.5 Hz (1000ms / 16ms)
- **Sincronización**: Intenta igualar la frecuencia del game loop nativo
- **Overhead**: Timer independiente del game loop principal

#### Mecanismo de Force Update

```typescript
// Línea 29: Hack para forzar re-renderizado
forceUpdate({}); // Cambia referencia del objeto para triggerar render
```

**Análisis técnico**:

```typescript
// Interno de React (conceptual)
const [, setTrigger] = useState({});
const forceUpdate = () => setTrigger({}); // Nueva referencia = re-render

// Cada llamada:
setTrigger({}); // {} !== {} siempre, React detecta cambio
```

**Por qué es necesario**:

- El World ECS modifica componentes **in-place**
- React no detecta mutaciones profundas
- GameRenderer necesita re-ejecutar `world.query()` para ver cambios

### Flujo de Datos Bidireccional

#### React → ECS (Input)

```typescript
// GameControls component (conceptual)
const handleThrust = (active: boolean) => {
  gameRef.current?.setInput(active, false, false, false)
}

// InputSystem recibe inmediatamente
setInput(thrust, rotateLeft, rotateRight, shoot) {
  this.keys.clear()
  if (thrust) this.keys.add("ArrowUp")  // Actualización síncrona
}
```

**Características**:

- **Latencia**: Prácticamente 0ms (llamada directa)
- **Threading**: Main thread únicamente
- **Buffering**: No buffer, estado inmediato

#### ECS → React (State Polling)

```typescript
// AsteroidsGame.getGameState()
getGameState(): GameStateComponent | null {
  const gameStates = this.world.query("GameState")
  if (gameStates.length > 0) {
    return this.world.getComponent<GameStateComponent>(
      gameStates[0], "GameState"
    ) || null
  }
  return null
}
```

**Pipeline de datos**:

1. **ECS Systems** modifican `GameStateComponent`
2. **Timer (16ms)** invoca `getGameState()`
3. **React State** se actualiza vía `setGameState()`
4. **UI Components** re-renderizan con nuevo estado

### Análisis de Performance

#### Overhead del Polling

```typescript
// Cada 16ms se ejecuta:
const gameState = gameRef.current.getGameState(); // Query ECS
setGameState(gameState); // React setState
forceUpdate({}); // Trigger re-render
```

**Métricas estimadas**:

- **Query cost**: O(n) donde n = entidades con "GameState" (típicamente 1)
- **setState cost**: Shallow comparison de `GameStateComponent`
- **forceUpdate cost**: Full component tree re-render
- **Frecuencia total**: 60 operaciones/segundo

#### Render Cascade

```typescript
// Cada forceUpdate({}) causa:
App re-render
├── GameRenderer re-render
│   └── world.query("Position", "Render")  // O(n×2) query
│   └── renderables.map(renderEntity)      // SVG regeneration
├── GameUI re-render
│   └── Muestra gameState actualizado
└── GameControls re-render
    └── Event handlers unchanged (useCallback recomendado)
```

### Problemas Identificados

#### 1. Double Rendering Loop

```typescript
// Game Loop Nativo (requestAnimationFrame)
gameLoop() {
  world.update(deltaTime)       // 60 FPS - modifica World
  requestAnimationFrame(gameLoop)
}

// React Sync Loop (setInterval)
setInterval(() => {
  forceUpdate({})               // 60 FPS - re-renderiza React
}, 16)
```

**Problema**: Dos loops independientes pueden **desincronizarse**

- Game loop: Variable timing basado en monitor refresh
- React timer: Fixed 16ms timing

#### 2. Unnecessary Re-renders

```typescript
// GameRenderer ejecuta en cada forceUpdate
const renderables = world.query("Position", "Render")  // No memoized!

// Aunque solo una entidad cambió posición, todas se re-procesan
renderables.map(entity => (
  <SomeComponent key={entity} ... />  // Full SVG regeneration
))
```

#### 3. Memory Pressure

```typescript
setInterval(() => {
  forceUpdate({}); // Crea nuevo objeto cada 16ms
}, 16);

// 60 objetos/segundo × 60 segundos = 3600 objetos temporales/minuto
```

### Soluciones Optimizadas

#### 1. Single Loop Synchronization

```typescript
// Recomendado: Sync en el mismo RAF loop
private gameLoop = (): void => {
  if (!this.isRunning) return

  const currentTime = performance.now()
  const deltaTime = currentTime - this.lastTime
  this.lastTime = currentTime

  // Update ECS
  this.world.update(deltaTime)

  // Notify React (custom hook)
  this.notifyReactUpdate?.()  // Optional callback

  this.gameLoopId = requestAnimationFrame(this.gameLoop)
}
```

#### 2. Selective Re-rendering

```typescript
// Custom hook para evitar re-renders innecesarios
const useGameState = (game: AsteroidsGame) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    game.onStateChange((newState) => {
      // Event-based
      setState((prevState) => {
        // Shallow comparison para evitar re-renders
        if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
          return newState;
        }
        return prevState;
      });
    });
  }, [game]);

  return state;
};
```

#### 3. Memoized Rendering

```typescript
// GameRenderer optimizado
const GameRenderer = memo(({ world }: GameRendererProps) => {
  const renderables = useMemo(
    () => world.query("Position", "Render"),
    [world.version] // Version tracking del World
  );

  return <svg>{renderables.map(MemoizedEntity)} // Individual memoization</svg>;
});
```

### Event-Based Alternative

#### Observer Pattern Implementation

```typescript
class ObservableWorld extends World {
  private observers: ((event: WorldEvent) => void)[] = [];

  addObserver(callback: (event: WorldEvent) => void) {
    this.observers.push(callback);
  }

  private notifyObservers(event: WorldEvent) {
    this.observers.forEach((observer) => observer(event));
  }

  removeEntity(entity: Entity): void {
    super.removeEntity(entity);
    this.notifyObservers({ type: "ENTITY_REMOVED", entity });
  }

  addComponent<T extends Component>(entity: Entity, component: T): void {
    super.addComponent(entity, component);
    this.notifyObservers({ type: "COMPONENT_ADDED", entity, component });
  }
}
```

#### React Integration

```typescript
const useWorldEvents = (world: ObservableWorld) => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleWorldEvent = (event: WorldEvent) => {
      // Increment version to trigger re-renders only when necessary
      setVersion((v) => v + 1);
    };

    world.addObserver(handleWorldEvent);

    return () => world.removeObserver(handleWorldEvent);
  }, [world]);

  return version; // Dependency para useMemo
};
```

### Benchmarking Tools

#### Performance Measurement

```typescript
class PerformanceProfiler {
  private metrics = {
    gameLoopTime: 0,
    reactSyncTime: 0,
    renderTime: 0,
  };

  measureGameLoop(fn: () => void) {
    const start = performance.now();
    fn();
    this.metrics.gameLoopTime = performance.now() - start;
  }

  measureReactSync(fn: () => void) {
    const start = performance.now();
    fn();
    this.metrics.reactSyncTime = performance.now() - start;
  }

  getAverageFrameTime(): number {
    return this.metrics.gameLoopTime + this.metrics.reactSyncTime;
  }

  logMetrics() {
    console.table(this.metrics);
  }
}
```

### Configuración de Debugging

```typescript
// Development mode diagnostics
const App = () => {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    if (debugMode && gameRef.current) {
      // Log sync frequency
      const syncMetrics = {
        reactRenders: 0,
        ecsUpdates: 0,
      };

      const originalUpdate = gameRef.current.world.update;
      gameRef.current.world.update = (deltaTime: number) => {
        syncMetrics.ecsUpdates++;
        return originalUpdate.call(gameRef.current.world, deltaTime);
      };

      // Log every second
      const logInterval = setInterval(() => {
        console.log("Sync metrics:", syncMetrics);
        syncMetrics.reactRenders = 0;
        syncMetrics.ecsUpdates = 0;
      }, 1000);

      return () => clearInterval(logInterval);
    }
  }, [debugMode]);

  return (
    <div>
      <button onClick={() => setDebugMode(!debugMode)}>
        Toggle Debug: {debugMode ? "ON" : "OFF"}
      </button>
      {/* Game components */}
    </div>
  );
};
```

## Conclusiones

La sincronización actual en `App.tsx` utiliza un **patrón de polling temporal** que funciona pero tiene limitaciones de performance. Para aplicaciones más complejas, se recomienda:

1. **Event-driven updates** en lugar de polling
2. **Memoización selectiva** de componentes React
3. **Single loop synchronization** para evitar drift
4. **Performance monitoring** en desarrollo

El patrón actual es **suficiente para Asteroids** pero no escala bien a juegos con cientos de entidades.

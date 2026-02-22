## Arquitectura del Motor de Juego

### Sistema ECS (Entity-Component-System)

El juego implementa un patrón ECS puro definido en `src/game/ecs-world.ts`:

```typescript
// Entidades: identificadores numéricos únicos
type Entity = number;

// Componentes: datos puros sin lógica
interface Component {
  type: ComponentType;
}

// Sistemas: lógica de procesamiento
abstract class System {
  abstract update(world: World, deltaTime: number): void;
}
```

La clase `World` (líneas 9-56 en `ecs-world.ts`) actúa como registro central que:

- Asigna IDs únicos a entidades (`nextEntityId++` línea 13)
- Almacena componentes en `Map<ComponentType, Map<Entity, Component>>` (línea 11)
- Ejecuta sistemas en orden secuencial (`systems.forEach` línea 53)

### Tipos de Componentes del Juego

El sistema define 9 tipos de componentes en `src/types/GameTypes.ts` (líneas 7-81):

| Componente           | Propósito               | Propiedades Clave                         |
| -------------------- | ----------------------- | ----------------------------------------- | -------- | -------- |
| `PositionComponent`  | Ubicación espacial      | `x: number, y: number`                    |
| `VelocityComponent`  | Movimiento              | `dx: number, dy: number`                  |
| `RenderComponent`    | Representación visual   | `shape, size, color, rotation`            |
| `ColliderComponent`  | Detección de colisiones | `radius: number`                          |
| `InputComponent`     | Entrada del jugador     | `thrust, rotateLeft, rotateRight, shoot`  |
| `HealthComponent`    | Sistema de vida         | `current, max, invulnerableRemaining`      |
| `TTLComponent`       | Tiempo de vida          | `remaining: number`                       |
| `AsteroidComponent`  | Metadatos de asteroide  | `size: "large" | "medium" | "small"`      |
| `GameStateComponent` | Estado global           | `lives, score, level, isGameOver`         |

### Sistemas de Procesamiento

El juego ejecuta 5 sistemas principales en `AsteroidsGame.setupSystems()` (líneas 22-29):

1. **`InputSystem`** (`src/game/systems/InputSystem.ts`):

   - Captura eventos de teclado vía `window.addEventListener` (líneas 15-16)
   - Convierte input a componentes de velocidad y rotación (líneas 35-47)
   - Maneja disparo con cooldown de 200ms (línea 10, líneas 50-54)

2. **`MovementSystem`** (`src/game/systems/MovementSystem.ts`):

   - Actualiza posiciones: `pos.x += (vel.dx * deltaTime) / 1000` (línea 11)
   - Implementa wrapping de pantalla (líneas 14-17)

3. **`CollisionSystem`** (`src/game/systems/CollisionSystem.ts`):

   - Detección por fuerza bruta O(n²) (líneas 11-18)
   - Maneja colisiones bala-asteroide y nave-asteroide (líneas 35-46)
   - División de asteroides en `splitAsteroid()` (líneas 48-59)

4. **`TTLSystem`** (`src/game/systems/TTLSystem.ts`):

   - Decremente `ttl.remaining -= deltaTime` (línea 9)
   - Elimina entidades expiradas (líneas 11-15)

5. **`GameStateSystem`** (`src/game/systems/GameStateSystem.ts`):
   - Cuenta asteroides restantes vía `world.query("Asteroid")` (línea 13)
   - Genera nueva oleada cuando `asteroidsRemaining === 0` (líneas 16-19)

### Configuración del Juego

Las constantes están centralizadas en `GAME_CONFIG` (`src/types/GameTypes.ts` líneas 125-142):

```typescript
SCREEN_WIDTH: 800, SCREEN_HEIGHT: 600
SHIP_THRUST: 200, SHIP_ROTATION_SPEED: 3
BULLET_SPEED: 300, BULLET_TTL: 2000
INVULNERABILITY_DURATION: 2000
```

### Factory Pattern para Entidades

`src/game/EntityFactory.ts` define 3 factories:

- **`createShip()`** (líneas 4-23): Nave con Input, Health, Collider
- **`createAsteroid()`** (líneas 25-44): Tamaños mapeados `{large: 30, medium: 20, small: 10}`
- **`createBullet()`** (líneas 46-62): TTL de 2000ms, velocidad calculada por ángulo

### Gestión de Estado React-Game

En `app/index.tsx`, la sincronización ocurre mediante un modelo de suscripción:

```typescript
// Suscripción a las actualizaciones del juego en lugar de polling
useEffect(() => {
  const newGame = new AsteroidsGame();
  setGame(newGame);
  newGame.start();

  const unsubscribe = newGame.subscribe((updatedGame) => {
    setGameState(updatedGame.getGameState());
    forceUpdate({}); // Fuerza re-render para entidades del juego
  });

  return () => {
    unsubscribe();
    newGame.stop();
  };
}, []);
```

El `forceUpdate({})` es necesario porque las entidades del juego mutan por referencia y no activan automáticamente el ciclo de renderizado de React.

## Sistema de Gestión de Estado

### GameStateSystem Architecture

El `GameStateSystem` (`src/game/systems/GameStateSystem.ts`) implementa la lógica de progresión y administración del estado global del juego. Se ejecuta como parte del game loop principal en cada frame.

### Componente de Estado Global

El sistema opera sobre entidades que poseen el componente `GameStateComponent` definido en `src/types/GameTypes.ts` (líneas 74-81):

```typescript
interface GameStateComponent extends Component {
  type: "GameState";
  lives: number; // Vidas restantes del jugador
  score: number; // Puntuación acumulada
  level: number; // Nivel actual
  asteroidsRemaining: number; // Contador de asteroides vivos
}
```

### Inicialización del Estado

El estado se crea en `AsteroidsGame.initializeGame()` (líneas 32-39):

```typescript
const gameState = this.world.createEntity();
this.world.addComponent(gameState, {
  type: "GameState",
  lives: 3, // Vidas iniciales
  score: 0, // Sin puntuación inicial
  level: 1, // Comienza en nivel 1
  asteroidsRemaining: 0, // Se actualiza por el sistema
});
```

### Lógica de Actualización del Sistema

El método `update()` (líneas 6-26) implementa tres responsabilidades principales:

#### 1. Conteo de Asteroides Activos

```typescript
// Líneas 13-14: Query y actualización del contador
const asteroids = world.query("Asteroid");
gameState.asteroidsRemaining = asteroids.length;
```

El sistema consulta todas las entidades con componente `Asteroid` y actualiza el contador en tiempo real.

#### 2. Generación de Nueva Oleada

```typescript
// Líneas 16-19: Detección de oleada completa
if (gameState.asteroidsRemaining === 0) {
  this.spawnAsteroidWave(world, gameState.level);
  gameState.level++;
}
```

Cuando no quedan asteroides, se dispara automáticamente:

- Spawn de nueva oleada
- Incremento del nivel

#### 3. Detección de Game Over

```typescript
// Líneas 21-26: Verificación de vidas
const ships = world.query("Health", "Input");
const shipHealths = ships.map(
  (ship) => world.getComponent<HealthComponent>(ship, "Health")!.current
);

if (shipHealths.every((health) => health <= 0)) {
  console.log(`Game Over! Score: ${gameState.score}`);
}
```

**Limitación actual**: Solo logea a consola, no implementa reinicio o pantalla de game over.

### Algoritmo de Spawn de Asteroides

El método `spawnAsteroidWave()` (líneas 28-39) implementa escalado de dificultad:

```typescript
// Línea 29: Fórmula de escalado con tope
const asteroidCount = Math.min(4 + level, 12);

// Líneas 31-38: Distribución circular
for (let i = 0; i < asteroidCount; i++) {
  const angle = (Math.PI * 2 * i) / asteroidCount; // División equitativa
  const distance = 200; // Radio fijo
  const x = 400 + Math.cos(angle) * distance; // Centro + offset
  const y = 300 + Math.sin(angle) * distance;

  createAsteroid(world, x, y, "large"); // Solo asteroides grandes
}
```

**Características del spawn**:

- **Escalado**: `4 + level` asteroides, máximo 12
- **Posicionamiento**: Círculo perfecto de radio 200px centrado en (400,300)
- **Tipo**: Solo asteroides "large" - la fragmentación crea los menores
- **Coordenadas fijas**: No considera `GAME_CONFIG.SCREEN_WIDTH/HEIGHT`

### Integración con Otros Sistemas

#### Actualización de Puntuación

La puntuación se modifica desde `CollisionSystem.addScore()` (líneas 61-67 en `CollisionSystem.ts`):

```typescript
private addScore(world: World, points: number): void {
  const gameStates = world.query("GameState")
  if (gameStates.length > 0) {
    const gameState = world.getComponent<GameStateComponent>(gameStates[0], "GameState")!
    gameState.score += points  // Suma directa, 10 puntos por asteroide
  }
}
```

#### Reducción de Vidas

Las vidas se decrementan en `CollisionSystem.handleCollision()` (líneas 42-43):

```typescript
if (healthA && asteroidB) {
  healthA.current--; // Decremento directo de vida
  world.removeEntity(entityB);
}
```

### Acceso desde React

El estado se expone a la UI mediante `AsteroidsGame.getGameState()` (líneas 84-90):

```typescript
getGameState(): GameStateComponent | null {
  const gameStates = this.world.query("GameState")
  if (gameStates.length > 0) {
    return this.world.getComponent<GameStateComponent>(gameStates[0], "GameState") || null
  }
  return null
}
```

Este método se invoca cada 16ms desde `App.tsx` (línea 27) para sincronizar la UI React con el estado ECS.

### Limitaciones del Diseño Actual

1. **Singleton implícito**: Asume solo una entidad con `GameState`
2. **Hardcoded values**: Vidas iniciales (3), puntos por kill (10), radio de spawn (200)
3. **Sin persistencia**: El estado se pierde al cerrar la aplicación
4. **Game Over incompleto**: Solo logging, sin reinicio automático
5. **Spawn fijo**: No considera el tamaño de pantalla dinámico

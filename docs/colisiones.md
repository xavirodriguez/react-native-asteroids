## Sistema de Lógica de Colisiones

### CollisionSystem Architecture

El `CollisionSystem` (`src/game/systems/CollisionSystem.ts`) implementa detección y resolución de colisiones mediante un algoritmo de fuerza bruta que verifica todas las parejas de entidades con componentes `Position` y `Collider`.

### Algoritmo de Detección

#### Query de Entidades Colisionables

```typescript
// Línea 8: Obtención de entidades con colisión
const colliders = world.query("Position", "Collider");
```

Solo las entidades que poseen ambos componentes participan en la detección de colisiones.

#### Verificación de Parejas O(n²)

```typescript
// Líneas 10-18: Algoritmo de fuerza bruta
for (let i = 0; i < colliders.length; i++) {
  for (let j = i + 1; j < colliders.length; j++) {
    const entityA = colliders[i];
    const entityB = colliders[j];

    if (this.checkCollision(world, entityA, entityB)) {
      this.handleCollision(world, entityA, entityB);
    }
  }
}
```

**Complejidad**: O(n²) donde n = número de entidades colisionables
**Optimización**: `j = i + 1` evita verificar la misma pareja dos veces

### Detección Geométrica por Distancia

El método `checkCollision()` (líneas 20-32) implementa detección circular:

```typescript
// Líneas 21-24: Obtención de componentes
const posA = world.getComponent<PositionComponent>(entityA, "Position")!;
const posB = world.getComponent<PositionComponent>(entityB, "Position")!;
const colliderA = world.getComponent<ColliderComponent>(entityA, "Collider")!;
const colliderB = world.getComponent<ColliderComponent>(entityB, "Collider")!;

// Líneas 26-30: Cálculo de distancia euclidiana
const dx = posA.x - posB.x;
const dy = posA.y - posB.y;
const distance = Math.sqrt(dx * dx + dy * dy);

return distance < colliderA.radius + colliderB.radius;
```

**Fórmula**: `√[(x₁-x₂)² + (y₁-y₂)²] < r₁ + r₂`

### Tipos de Colisiones Manejadas

El método `handleCollision()` (líneas 34-55) identifica tipos de entidades mediante componentes específicos:

```typescript
// Líneas 35-40: Identificación de tipos de entidad
const asteroidA = world.getComponent(entityA, "Asteroid");
const asteroidB = world.getComponent(entityB, "Asteroid");
const healthA = world.getComponent<HealthComponent>(entityA, "Health");
const healthB = world.getComponent<HealthComponent>(entityB, "Health");
const ttlA = world.getComponent(entityA, "TTL");
const ttlB = world.getComponent(entityB, "TTL");
```

#### 1. Colisión Bala-Asteroide

```typescript
// Líneas 42-47: Bala (TTL) vs Asteroide
if (asteroidA && ttlB) {
  this.splitAsteroid(world, entityA); // Fragmentar asteroide
  world.removeEntity(entityB); // Eliminar bala
  this.addScore(world, 10); // +10 puntos
} else if (asteroidB && ttlA) {
  this.splitAsteroid(world, entityB);
  world.removeEntity(entityA);
  this.addScore(world, 10);
}
```

**Identificación**: Entidades con componente `TTL` son balas
**Consecuencias**: Asteroide se fragmenta, bala desaparece, puntuación aumenta

#### 2. Colisión Nave-Asteroide

```typescript
// Líneas 49-54: Nave (Health) vs Asteroide
if (healthA && asteroidB) {
  healthA.current--; // -1 vida
  world.removeEntity(entityB); // Asteroide desaparece
} else if (healthB && asteroidA) {
  healthB.current--;
  world.removeEntity(entityA);
}
```

**Identificación**: Entidades con componente `Health` son naves
**Consecuencias**: Nave pierde vida, asteroide desaparece

### Sistema de Fragmentación de Asteroides

El método `splitAsteroid()` (líneas 57-71) implementa el sistema de división jerárquica:

```typescript
// Líneas 58-59: Obtención de datos del asteroide
const asteroid = world.getComponent<AsteroidComponent>(
  asteroidEntity,
  "Asteroid"
)!;
const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position")!;

// Líneas 61-67: Lógica de fragmentación
if (asteroid.size === "large") {
  createAsteroid(world, pos.x + 10, pos.y + 10, "medium");
  createAsteroid(world, pos.x - 10, pos.y - 10, "medium");
} else if (asteroid.size === "medium") {
  createAsteroid(world, pos.x + 5, pos.y + 5, "small");
  createAsteroid(world, pos.x - 5, pos.y - 5, "small");
}

// Línea 69: Eliminación del asteroide original
world.removeEntity(asteroidEntity);
```

**Reglas de fragmentación**:

- `large` → 2 asteroides `medium` (offset ±10px)
- `medium` → 2 asteroides `small` (offset ±5px)
- `small` → No se fragmenta (desaparece)

### Sistema de Puntuación

El método `addScore()` (líneas 73-80) actualiza la puntuación global:

```typescript
private addScore(world: World, points: number): void {
  const gameStates = world.query("GameState")
  if (gameStates.length > 0) {
    const gameState = world.getComponent<GameStateComponent>(gameStates[0], "GameState")!
    gameState.score += points
  }
}
```

**Valor fijo**: +10 puntos por cualquier asteroide destruido, independientemente del tamaño

### Radios de Colisión por Entidad

Los radios se definen en `EntityFactory.ts`:

```typescript
// Nave (createShip línea 15)
world.addComponent(ship, { type: "Collider", radius: 8 });

// Asteroides (createAsteroid líneas 37-38)
const sizeMap = { large: 30, medium: 20, small: 10 };
world.addComponent(asteroid, { type: "Collider", radius: sizeMap[size] });

// Balas (createBullet línea 59)
world.addComponent(bullet, { type: "Collider", radius: 2 });
```

### Limitaciones del Sistema Actual

1. **Algoritmo O(n²)**: No escala con muchas entidades
2. **Sin spatial partitioning**: No usa quadtrees o grids
3. **Colisiones simples**: Solo círculos, no formas complejas
4. **Sin continuous collision detection**: Objetos rápidos pueden atravesarse
5. **Hardcoded offsets**: Los offsets de fragmentación (+10, +5) son fijos
6. **Sin invulnerabilidad**: La nave puede perder múltiples vidas instantáneamente
7. **Sin diferenciación de puntos**: Todos los asteroides valen lo mismo

### Interacción con Otros Sistemas

- **MovementSystem**: Proporciona las posiciones actualizadas para detección
- **GameStateSystem**: Recibe actualizaciones de puntuación y detecta game over por vidas
- **TTLSystem**: Las balas tienen tiempo de vida limitado tras la colisión

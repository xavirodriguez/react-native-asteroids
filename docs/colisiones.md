## Sistema de Lógica de Colisiones

### CollisionSystem Architecture

El `CollisionSystem` (`src/game/systems/CollisionSystem.ts`) implementa detección y resolución de colisiones mediante un algoritmo de fuerza bruta que verifica todas las parejas de entidades con componentes `Position` y `Collider`.

### Algoritmo de Detección

#### Query de Entidades Colisionables

```typescript
const colliders = world.query("Position", "Collider");
```

Solo las entidades que poseen ambos componentes participan en la detección de colisiones.

#### Verificación de Parejas O(N²)

```typescript
// Algoritmo de fuerza bruta
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

**Complejidad**: O(N²) donde N = número de entidades colisionables.
**Optimización**: `j = i + 1` evita verificar la misma pareja dos veces y la colisión de una entidad consigo misma.

### Detección Geométrica por Distancia

El método `checkCollision()` implementa detección circular (Circle-Circle):

```typescript
const dx = posA.x - posB.x;
const dy = posA.y - posB.y;
const distance = Math.sqrt(dx * dx + dy * dy);

return distance < colliderA.radius + colliderB.radius;
```

**Fórmula**: `√[(x₁-x₂)² + (y₁-y₂)²] < r₁ + r₂`

### Tipos de Colisiones Manejadas

El método `handleCollision()` identifica tipos de entidades mediante sus componentes:

#### 1. Colisión Bala-Asteroide

```typescript
// Bala (TTL) vs Asteroide
if (asteroidA && ttlB) {
  this.splitAsteroid(world, entityA); // Fragmentar asteroide
  world.removeEntity(entityB); // Eliminar bala
  this.addScore(world, 10); // +10 puntos
}
```

**Consecuencias**: El asteroide se fragmenta (o desaparece si es pequeño), la bala se elimina del mundo y la puntuación aumenta.

#### 2. Colisión Nave-Asteroide

```typescript
// Nave (Health) vs Asteroide
if (healthA && asteroidB) {
  healthA.current--; // -1 vida
  // El asteroide permanece en el mundo
}
```

**Consecuencias**: La nave pierde un punto de salud. A diferencia de la bala, el asteroide **no desaparece** al impactar con la nave, lo que aumenta la dificultad y requiere que el jugador maniobre para escapar tras el impacto.

### Sistema de Fragmentación de Asteroides

El método `splitAsteroid()` implementa el sistema de división jerárquica:

- `large` → Crea 2 asteroides `medium` y se elimina el original.
- `medium` → Crea 2 asteroides `small` y se elimina el original.
- `small` → Simplemente se elimina el original.

**Offsets**: Se aplican pequeños desplazamientos (±10px o ±5px) al crear los fragmentos para evitar que se solapen perfectamente.

### Sistema de Puntuación

El método `addScore()` actualiza la puntuación global almacenada en el componente `GameState`:

```typescript
private addScore(world: World, points: number): void {
  const gameStates = world.query("GameState")
  if (gameStates.length > 0) {
    const gameState = world.getComponent<GameStateComponent>(gameStates[0], "GameState")
    if (gameState) {
      gameState.score += points
    }
  }
}
```

### Radios de Colisión por Entidad

Los radios están predefinidos en `EntityFactory.ts`:

- **Nave**: 8 píxeles.
- **Asteroides**: 30 (grande), 20 (mediano), 10 (pequeño) píxeles.
- **Balas**: 2 píxeles.

### Limitaciones Identificadas

1. **Complejidad O(N²)**: El rendimiento puede degradarse si hay un número muy elevado de proyectiles y asteroides simultáneos.
2. **Detección Simple**: No maneja formas complejas ni colisiones continuas (tunneling) para objetos extremadamente rápidos.
3. **Sin Invulnerabilidad Temporal**: Tras un impacto, la nave puede perder vidas rápidamente si permanece en contacto con un asteroide.

### Interacción con Otros Sistemas

- **MovementSystem**: Proporciona las posiciones actualizadas.
- **GameStateSystem**: Monitorea el estado de salud y la destrucción de asteroides para gestionar el flujo del juego.
- **TTLSystem**: Gestiona la eliminación natural de balas que no impactan contra nada.

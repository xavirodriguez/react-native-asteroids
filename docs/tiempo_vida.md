## Sistema de Tiempo de Vida (TTL)

### TTLSystem Architecture

El `TTLSystem` (`src/game/systems/TTLSystem.ts`) implementa un sistema de gestión de tiempo de vida para entidades temporales, permitiendo que objetos como balas se eliminen automáticamente después de un período determinado.

### Componente TTL

El sistema opera sobre entidades que poseen el componente `TTLComponent` definido en `src/types/GameTypes.ts` (líneas 59-63):

```typescript
interface TTLComponent extends Component {
  type: "TTL";
  remaining: number; // Tiempo restante en milisegundos
}
```

### Algoritmo de Procesamiento

El método `update()` (líneas 4-18) implementa un algoritmo de dos fases:

#### Fase 1: Actualización de Contadores

```typescript
// Línea 5: Query de entidades con TTL
const ttlEntities = world.query("TTL");
const entitiesToRemove: number[] = [];

// Líneas 8-15: Decrementar y marcar para eliminación
ttlEntities.forEach((entity) => {
  const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;
  ttl.remaining -= deltaTime; // Reducir por tiempo transcurrido

  if (ttl.remaining <= 0) {
    entitiesToRemove.push(entity); // Marcar para eliminación
  }
});
```

**Decremento temporal**: `remaining -= deltaTime` donde `deltaTime` está en milisegundos

#### Fase 2: Eliminación Diferida

```typescript
// Líneas 17-19: Eliminación en lote
entitiesToRemove.forEach((entity) => {
  world.removeEntity(entity);
});
```

**Patrón de eliminación diferida**: Evita modificar la lista de entidades durante la iteración, previniendo errores de concurrencia.

### Creación de Entidades con TTL

#### Balas con Tiempo de Vida

Las balas son la única entidad que actualmente usa TTL, creadas en `EntityFactory.createBullet()` (líneas 60-61):

```typescript
world.addComponent(bullet, {
  type: "TTL",
  remaining: GAME_CONFIG.BULLET_TTL, // 2000ms = 2 segundos
});
```

**Configuración**: Las balas viven exactamente 2 segundos definidos en `GAME_CONFIG.BULLET_TTL` (`src/types/GameTypes.ts` línea 91).

### Integración con el Game Loop

El TTLSystem se ejecuta como parte del game loop principal en `AsteroidsGame.setupSystems()` (línea 27):

```typescript
this.world.addSystem(new TTLSystem());
```

**Orden de ejecución**:

1. `InputSystem` - Genera nuevas balas
2. `MovementSystem` - Mueve balas existentes
3. `CollisionSystem` - Detecta impactos (puede eliminar balas)
4. `TTLSystem` - Elimina balas expiradas
5. `GameStateSystem` - Actualiza estado global

### Cálculo de Tiempo de Vida Efectivo

Con la configuración actual:

```typescript
// Bala creada con:
BULLET_SPEED: 300,    // píxeles por segundo
BULLET_TTL: 2000,     // milisegundos

// Distancia máxima recorrida:
// 300 px/s * 2s = 600 píxeles
```

En una pantalla de 800x600, las balas pueden atravesar completamente la pantalla antes de expirar.

### Interacción con Otros Sistemas

#### InputSystem - Creación de Balas

En `InputSystem.update()` (líneas 50-54), las balas se crean con TTL automático:

```typescript
if (input.shoot && currentTime - this.lastShootTime > this.shootCooldown) {
  createBullet(world, pos.x, pos.y, render.rotation); // Incluye TTL
  this.lastShootTime = currentTime;
}
```

#### CollisionSystem - Eliminación Prematura

Las balas pueden eliminarse antes de expirar por colisión en `CollisionSystem.handleCollision()` (líneas 43, 47):

```typescript
if (asteroidA && ttlB) {
  this.splitAsteroid(world, entityA);
  world.removeEntity(entityB); // Bala eliminada por colisión
  this.addScore(world, 10);
}
```

### Casos de Uso Potenciales No Implementados

El sistema TTL podría extenderse para manejar:

1. **Power-ups temporales**: Items con duración limitada
2. **Efectos visuales**: Explosiones, partículas
3. **Invulnerabilidad temporal**: Nave inmune tras recibir daño
4. **Asteroides auto-destructivos**: Asteroides que desaparecen solos

### Limitaciones del Diseño Actual

1. **Uso limitado**: Solo las balas usan TTL
2. **Configuración fija**: TTL hardcodeado, no configurable por entidad
3. **Sin eventos de expiración**: No se pueden ejecutar acciones al expirar
4. **Sin pausa/resume**: El TTL continúa durante pausas del juego
5. **Granularidad**: Depende del framerate para precisión

### Comportamiento con Variaciones de Framerate

```typescript
// Con 60 FPS: deltaTime ≈ 16.67ms
ttl.remaining -= 16.67; // Decremento suave

// Con 30 FPS: deltaTime ≈ 33.33ms
ttl.remaining -= 33.33; // Decremento más brusco
```

El sistema es **framerate-independent** porque usa `deltaTime` real, no un decremento fijo por frame.

### Patrón de Eliminación Segura

El patrón de eliminación en dos fases previene el problema clásico de modificar una colección durante iteración:

```typescript
// ❌ Problemático: modifica durante iteración
ttlEntities.forEach((entity) => {
  if (ttl.remaining <= 0) {
    world.removeEntity(entity); // Puede corromper la iteración
  }
});

// ✅ Correcto: eliminación diferida
const toRemove = [];
// ... marcar entidades
toRemove.forEach((entity) => world.removeEntity(entity));
```

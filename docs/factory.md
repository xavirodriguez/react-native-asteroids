## Factory de Entidades

### Architecture del Factory Pattern

El `EntityFactory` (`src/game/EntityFactory.ts`) implementa el patrón Factory Method para centralizar la creación de entidades del juego. Cada factory method encapsula la lógica de composición de componentes específica para un tipo de entidad.

### Import y Dependencias

```typescript
// Línea 1: Importación del tipo World desde el ECS
import type { World } from "./World"; // ❌ Ruta incorrecta
// Línea 2: Importación de tipos del juego
import { type Entity, GAME_CONFIG } from "../types/GameTypes";
```

**Error de import**: La línea 1 importa desde `"./World"` pero el archivo correcto es `"./ecs-world"`, como se confirma en `src/game/World.ts` línea 1 que re-exporta desde `ecs-world`.

### Factory Method: createShip()

El método `createShip()` (líneas 4-29) crea la entidad jugador con 6 componentes:

#### Composición de Componentes

```typescript
// Líneas 7-8: Componentes de física
world.addComponent(ship, { type: "Position", x, y });
world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 });

// Líneas 9-15: Componente de renderizado
world.addComponent(ship, {
  type: "Render",
  shape: "triangle", // Forma triangular distintiva
  size: 10, // Tamaño fijo en píxeles
  color: "#FFFFFF", // Blanco (ignorado por GameRenderer)
  rotation: 0, // Orientación inicial hacia arriba
});

// Líneas 16-17: Componentes de juego
world.addComponent(ship, { type: "Collider", radius: 8 }); // Hitbox circular
world.addComponent(ship, { type: "Health", current: 3, max: 3 }); // 3 vidas iniciales

// Líneas 18-24: Componente de entrada
world.addComponent(ship, {
  type: "Input",
  thrust: false, // Estado inicial: sin thrust
  rotateLeft: false, // Sin rotación inicial
  rotateRight: false,
  shoot: false, // Sin disparo inicial
});
```

#### Características Específicas de la Nave

- **Hitbox vs Visual**: `radius: 8` pero `size: 10` - hitbox 20% más pequeña que visual
- **Velocidad inicial**: `dx: 0, dy: 0` - nave comienza estática
- **Único con Input**: Solo la nave posee componente `Input`
- **Único con Health**: Solo la nave puede perder vidas

### Factory Method: createAsteroid()

El método `createAsteroid()` (líneas 31-50) implementa asteroides escalables:

#### Sistema de Tamaños

```typescript
// Línea 32: Mapeo size → píxeles
const sizeMap = { large: 30, medium: 20, small: 10 };
```

**Relaciones de tamaño**: Large es 3x Small, Medium es 2x Small

#### Composición por Tamaño

```typescript
// Líneas 34-39: Física con velocidad aleatoria
world.addComponent(asteroid, { type: "Position", x, y });
world.addComponent(asteroid, {
  type: "Velocity",
  dx: (Math.random() - 0.5) * 100, // [-50, +50] px/s en X
  dy: (Math.random() - 0.5) * 100, // [-50, +50] px/s en Y
});

// Líneas 40-46: Renderizado escalado
world.addComponent(asteroid, {
  type: "Render",
  shape: "circle", // Siempre circular
  size: sizeMap[size], // Tamaño dinámico
  color: "#888888", // Gris constante
  rotation: 0, // Sin rotación visual
});

// Líneas 47-48: Colisión y metadatos
world.addComponent(asteroid, { type: "Collider", radius: sizeMap[size] });
world.addComponent(asteroid, { type: "Asteroid", size });
```

#### Generación de Velocidad

La fórmula `(Math.random() - 0.5) * 100` genera:

- **Rango**: [-50, +50] píxeles por segundo
- **Distribución**: Uniforme
- **Direcciones**: Todas las direcciones posibles
- **Velocidad**: Moderada para todos los tamaños

### Factory Method: createBullet()

El método `createBullet()` (líneas 52-70) crea proyectiles direccionales:

#### Cálculo Balístico

```typescript
// Líneas 55-59: Velocidad direccional
world.addComponent(bullet, {
  type: "Velocity",
  dx: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED, // Componente X
  dy: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED, // Componente Y
});
```

**Velocidad constante**: 300 px/s en la dirección `angle` (radianes)

#### Composición Temporal

```typescript
// Líneas 54-70: Todos los componentes
world.addComponent(bullet, { type: "Position", x, y }); // Posición inicial
world.addComponent(bullet, {
  /* velocidad direccional */
});
world.addComponent(bullet, {
  type: "Render",
  shape: "circle", // Punto amarillo
  size: 2, // Muy pequeña
  color: "#FFFF00", // Amarillo distintivo
  rotation: 0, // Sin rotación
});
world.addComponent(bullet, { type: "Collider", radius: 2 }); // Hitbox mínima
world.addComponent(bullet, { type: "TTL", remaining: GAME_CONFIG.BULLET_TTL }); // 2000ms
```

#### Características Balísticas

- **Tamaño mínimo**: `size: 2, radius: 2` - hitbox perfecta
- **Alta velocidad**: 300 px/s vs asteroides ~50 px/s máximo
- **Tiempo limitado**: 2 segundos de vuelo
- **Sin fricción**: Velocidad constante hasta expirar o colisionar

### Patrones de Uso en el Código

#### Inicialización del Juego

En `AsteroidsGame.initializeGame()` (líneas 31-44):

```typescript
// Línea 32: Creación de nave jugador
createShip(this.world, 400, 300); // Centro de pantalla hardcodeado

// Líneas 40-44: Spawn inicial de asteroides
for (let i = 0; i < 4; i++) {
  const angle = (Math.PI * 2 * i) / 4; // Distribución uniforme
  const x = 400 + Math.cos(angle) * 150; // Círculo de radio 150
  const y = 300 + Math.sin(angle) * 150;
  createAsteroid(this.world, x, y, "large"); // Solo asteroides grandes
}
```

#### Spawn de Nueva Oleada

En `GameStateSystem.spawnAsteroidWave()` (línea 38):

```typescript
createAsteroid(world, x, y, "large"); // Solo asteroides grandes iniciales
```

#### Fragmentación de Asteroides

En `CollisionSystem.splitAsteroid()` (líneas 63-67):

```typescript
if (asteroid.size === "large") {
  createAsteroid(world, pos.x + 10, pos.y + 10, "medium");
  createAsteroid(world, pos.x - 10, pos.y - 10, "medium");
} else if (asteroid.size === "medium") {
  createAsteroid(world, pos.x + 5, pos.y + 5, "small");
  createAsteroid(world, pos.x - 5, pos.y - 5, "small");
}
```

**Offsets fijos**: +10px para medium, +5px para small - no relacionados con el tamaño visual

#### Creación de Balas

En `InputSystem.update()` (línea 53):

```typescript
createBullet(world, pos.x, pos.y, render.rotation);
```

**Spawn point**: Posición exacta de la nave, dirección según rotación actual

### Análisis de Coherencia de Componentes

#### Relación Size vs Radius

```typescript
// Nave: size 10, radius 8    → ratio 0.8
// Large: size 30, radius 30  → ratio 1.0
// Medium: size 20, radius 20 → ratio 1.0
// Small: size 10, radius 10  → ratio 1.0
// Bala: size 2, radius 2     → ratio 1.0
```

**Inconsistencia**: Solo la nave tiene hitbox menor que su representación visual.

#### Velocidades Relativas

```typescript
// Nave: Variable (thrust + friction)
// Asteroides: [-50, +50] px/s random
// Balas: 300 px/s direccional
```

**Relación**: Las balas son 6x más rápidas que la velocidad máxima de asteroides.

### Limitaciones del Diseño Actual

1. **Valores hardcodeados**: Tamaños, colores, y stats no configurables
2. **Sin parámetros opcionales**: No se pueden crear variantes (ej: asteroide rápido)
3. **Posicionamiento manual**: Requiere calcular posiciones externamente
4. **Sin validación**: No verifica límites de pantalla o colisiones en spawn
5. **Import incorrecto**: Referencia errónea a `"./World"`
6. **Sin pooling**: Crea nuevas entidades en cada llamada
7. **Inconsistencia de hitboxes**: Solo la nave tiene ratio size/radius diferente

### Casos de Uso Potenciales

El factory podría extenderse para:

```typescript
// Asteroides especiales
createAsteroid(world, x, y, "large", { speed: 2.0, color: "#FF0000" });

// Power-ups
createPowerUp(world, x, y, "shield" | "rapidFire" | "multiShot");

// Enemigos
createEnemy(world, x, y, "fighter" | "bomber");
```

# Propuestas Técnicas: Tareas 3 y 4

Este documento detalla las soluciones técnicas propuestas para la estandarización del ciclo de vida de proyectiles y la centralización del sistema de haptics.

---

## Tarea 3 — Estandarizar el ciclo de vida de proyectiles con `EntityPool`

### 1. Funciones de Ciclo de Vida Estandarizadas

Utilizando el `PrefabPool` del motor, que gestiona tanto IDs como la reutilización de objetos de componentes.

```typescript
import {
  World,
  Entity,
  Component,
  PrefabPool,
  WorldCommandBuffer
} from "../engine";

/**
 * Crea un proyectil utilizando un PrefabPool, asegurando el reciclaje de IDs y memoria.
 * @param world Instancia del mundo ECS.
 * @param pool Instancia de PrefabPool configurada para el proyectil.
 * @param config Parámetros de inicialización.
 */
export function createProjectile<T extends Record<string, Component>, I>(
  world: World,
  pool: PrefabPool<T, I>,
  config: I
): Entity {
  // PrefabPool.acquire gestiona automáticamente el WorldCommandBuffer
  // si el mundo está en su ciclo de actualización.
  return pool.acquire(world, config);
}

/**
 * Libera un proyectil devolviendo sus componentes al pool y eliminando la entidad.
 * @param world Instancia del mundo ECS.
 * @param pool Instancia de PrefabPool de origen.
 * @param entity Entidad a destruir.
 */
export function releaseProjectile<T extends Record<string, Component>, I>(
  world: World,
  pool: PrefabPool<T, I>,
  entity: Entity
): void {
  const commands: WorldCommandBuffer = world.getCommandBuffer();

  // 1. Notificamos al pool para que recupere los objetos de los componentes
  pool.release(world, entity);

  // 2. Programamos la eliminación de la entidad del mundo
  commands.removeEntity(entity);
}
```

### 2. Ejemplo de uso en Asteroids

```typescript
// --- Disparo del Jugador (AsteroidInputSystem) ---
const bulletParams = {
  x: shipPos.x,
  y: shipPos.y,
  dx: Math.cos(angle) * speed,
  dy: Math.sin(angle) * speed,
  ttl: 1500
};
createProjectile(world, this.bulletPool, bulletParams);

// --- Destrucción por Impacto (AsteroidCollisionSystem) ---
private onBulletHit(world: World, bullet: Entity): void {
  // Liberación inmediata al pool tras el impacto
  releaseProjectile(world, this.bulletPool, bullet);
}
```

---

## Tarea 4 — Centralizar haptics en un `FeedbackSystem`

### 1. Componente de Solicitud

```typescript
import { Component } from "../engine/core/Component";

export type HapticPattern = "shoot" | "damage" | "death";

/**
 * Componente para solicitar feedback táctil de forma desacoplada.
 */
export interface HapticRequestComponent extends Component {
  type: "HapticRequest";
  pattern: HapticPattern;
}
```

### 2. FeedbackSystem

```typescript
import { System, World, SystemPhase, WorldCommandBuffer } from "../engine";
import { hapticShoot, hapticDamage, hapticDeath } from "../../utils/haptics";

export class FeedbackSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const query = world.getQuery("HapticRequest");
    const commands: WorldCommandBuffer = world.getCommandBuffer();

    query.forEach((entity) => {
      const request = world.getComponent<any>(entity, "HapticRequest");
      if (!request) return;

      this.triggerHaptic(request.pattern);
      commands.removeComponent(entity, "HapticRequest");
    });
  }

  private triggerHaptic(pattern: string): void {
    switch (pattern) {
      case "shoot": hapticShoot(); break;
      case "damage": hapticDamage(); break;
      case "death": hapticDeath(); break;
    }
  }
}
```

### 3. Ejemplo de uso en CollisionSystem

```typescript
// El sistema ya no importa utils/haptics directamente
commands.addComponent(ship, {
  type: "HapticRequest",
  pattern: "damage"
} as HapticRequestComponent);
```

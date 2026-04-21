# Guía de Onboarding para Desarrolladores del Motor

¡Bienvenido al equipo de ingeniería del motor! Esta guía te ayudará a entender los conceptos básicos para trabajar en este entorno ECS de alto rendimiento.

## 1. Reglas de Oro

Para mantener la integridad del motor, debes seguir estas reglas sin excepción:

1. **Nunca mutar el World durante una iteración**: Usa siempre el `WorldCommandBuffer` (`world.getCommandBuffer()`) si necesitas crear o borrar entidades/componentes dentro de un `System`.
2. **Determinismo ante todo**: Si tu lógica afecta al gameplay (física, puntuación, spawn), usa `RandomService.getInstance("gameplay")`. Nunca uses `Math.random()`.
3. **Componentes como Datos Puros**: Los componentes no deben tener métodos ni lógica. Son estructuras de datos (interfaces). La lógica vive en los `Systems`.
4. **Respetar las Fases**: Asegúrate de registrar tus sistemas en la fase correcta. No hagas cálculos físicos en la fase de `Presentation`.

## 2. Creando un Nuevo Sistema

Un sistema debe extender la clase `System` e implementar el método `update`:

```ts
import { System, World, SystemPhase } from "../core";

export class MyNewSystem extends System {
  public update(world: World, deltaTime: number): void {
    // 1. Consulta las entidades que te interesan
    const entities = world.query("Transform", "MyComponent");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      // 2. Obtén y muta componentes
      const transform = world.getComponent(entity, "Transform");
      // ... lógica ...
    }
  }
}
```

## 3. Registro del Sistema

Los sistemas se registran en la clase de tu juego (que extiende `BaseGame`):

```ts
protected registerSystems(): void {
  this.world.addSystem(new MyNewSystem(), {
    phase: SystemPhase.Simulation,
    priority: 10
  });
}
```

## 4. Trabajo con Jerarquías

Si tu entidad tiene un padre, el motor calculará automáticamente sus coordenadas de mundo (`worldX`, `worldY`).
- Usa `x`, `y` para movimiento relativo al padre.
- Lee `worldX`, `worldY` solo si necesitas la posición absoluta (ej: para colisiones globales).
- **Importante**: El cálculo de mundo ocurre al final del tick. Si cambias `x` en un sistema, `worldX` no se actualizará hasta que todos los sistemas terminen.

## 5. Depuración y Perfilado

El motor incluye un profiler de sistemas integrado. Puedes activarlo con:
`world.debugMode = true;`

Esto permitirá ver cuánto tiempo (en ms) consume cada sistema por frame, ayudándote a identificar cuellos de botella.

## 6. Testing

Todos los cambios en el core o sistemas base deben incluir tests unitarios en Jest. Consulta `src/engine/core/__tests__` para ver ejemplos de cómo testear el `World` y los `Systems`.

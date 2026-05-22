# Auditoría de Mutaciones ECS - Space Invaders

## 1. Problemas Detectados y Corregidos

### `src/games/space-invaders/systems/SpaceInvadersRenderSystem.ts`
- **Error**: Mutaciones directas a `render.color` y `health.invulnerableRemaining`.
- **Corrección**: Refactorizado para usar `world.mutateComponent` para ambos componentes. Se añadió una comprobación de igualdad para evitar mutaciones redundantes en el color del jugador.

### `src/games/space-invaders/systems/SpaceInvadersInputSystem.ts`
- **Error**: Uso de `getMutableComponent`. Aunque este método notifica al mundo, devuelve la referencia bruta, lo que permite mutaciones fuera del patrón de callback recomendado y puede llevar a inconsistencias.
- **Corrección**: Refactorizado para usar `world.mutateComponent`. Ahora se calculan los nuevos estados en variables locales y se aplican en un solo bloque de mutación por componente.

### `src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts`
- **Error**: La función `fireFromFormation` (que crea nuevas entidades de bala) se llamaba dentro del callback de `mutateComponent` del controlador de formación.
- **Corrección**: Se extrajo la lógica de disparo fuera del callback de mutación. Las mutaciones deben ser puras y rápidas; las operaciones estructurales (crear/destruir entidades) deben ocurrir fuera de ellas.

### `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`
- **Error**: Riesgo de `ReferenceError` con `gameState` en `handleCollision`.
- **Corrección**: Se añadió la recuperación explícita de `gameState` mediante `world.getSingleton` al inicio de `handleCollision`, asegurando que la variable esté disponible y actualizada en ese scope.

### `src/games/space-invaders/systems/__tests__/SpaceInvadersFormationSystem.test.ts`
- **Error**: Faltaban las importaciones de `SPACE_INVADERS_TEST_CONFIG` y `World`, lo que impedía la ejecución de las pruebas unitarias.
- **Corrección**: Añadidas las importaciones necesarias.

---

## 2. Patrón Recomendado

Para actualizar componentes de forma consistente y segura, sigue siempre este esquema:

```ts
// 1. Obtener datos de solo lectura para cálculos (opcional pero recomendado)
const transform = world.getComponent(entity, "Transform");
if (!transform) return;

// 2. Realizar cálculos complejos fuera de la mutación
const newX = transform.x + velocity.dx * deltaTime;

// 3. Aplicar los cambios en un bloque de mutación
world.mutateComponent<TransformComponent>(entity, "Transform", (t) => {
  t.x = newX;
  t.dirty = true; // Si el motor lo requiere para transformaciones
});
```

---

## 3. Recomendaciones de Prevención

1. **Inmutabilidad en Desarrollo**: Mantener activa la detección de `ILLEGAL MUTATION` en el `World.ts` mediante el Proxy actual. Es la herramienta más efectiva para atrapar estos errores pronto.
2. **Helper de Loteo**: Si se detectan cuellos de botella por múltiples llamadas a `mutateComponent` en una misma entidad, considerar implementar un `world.mutateEntity(entity, [CompA, CompB], (a, b) => { ... })`.
3. **Linting Estricto**: Ejecutar regularmente `./scripts/check-ecs-invariants.sh` para detectar patrones de asignación directa (`comp.prop = value`) fuera de bloques de mutación conocidos.
4. **Tipado `Readonly`**: Forzar que `getComponent` devuelva tipos `DeepReadonly<T>` para que el compilador de TypeScript marque como error cualquier intento de mutación directa antes de llegar a tiempo de ejecución.

# Auditoría Técnica de TinyAsterEngine

## 1. Rediseño de StateMachineComponent (Data-Oriented)
**Diagnóstico:** Crítico para la persistencia. La implementación actual usa instancias de clase que se pierden en `structuredClone` durante el `snapshot()`.
**Gravedad:** ALTA.
**Recomendación:** Migrar a un diseño donde el componente sea un POJO puro y la lógica resida en un `StateMachineRegistry`.

## 2. Corrección del Pipeline de HierarchySystem
**Diagnóstico:** Existe un "1-frame lag" porque `HierarchySystem` corre después del `world.update()`, pero las colisiones leen coordenadas mundo durante el update.
**Gravedad:** CRÍTICA.
**Recomendación:** Integrar `HierarchySystem` en el ciclo de `World.update()` en la fase `Transform`, antes de las colisiones.

## 3. Unificación de runSimulationStep
**Diagnóstico:** Duplicidad entre `DeterministicSimulation.ts` y el pipeline ECS. Riesgo de drift en multiplayer.
**Gravedad:** CRÍTICA.
**Recomendación:** Eliminar `DeterministicSimulation` y usar el pipeline ECS de forma unificada (headless).

## 4. Auditoría de Callbacks y Referencias Runtime
**Diagnóstico:** Callbacks como `onComplete` se pierden tras un `restore()`.
**Gravedad:** MEDIA.
**Recomendación:** Reemplazar callbacks por eventos diferidos o identificadores de sistema.

## 5. Endurecimiento de Regla de Mutación
**Diagnóstico:** `getComponent` devuelve referencias mutables sin control de versiones, rompiendo `deltaSnapshot`.
**Gravedad:** ALTA.
**Recomendación:** Usar tipos `Readonly` y forzar `mutateComponent`. Implementar un Proxy detector en desarrollo.

---

## Ranking de Prioridad
1. Pipeline de Jerarquía
2. Unificación de Simulación
3. Endurecimiento de Mutaciones
4. Data-Oriented FSM
5. Eliminación de Callbacks

## Hoja de Ruta
- **Fase 0:** Validación de desincronización actual.
- **Fase 1:** Corrección de Pipeline y Readonly getComponent.
- **Fase 2:** Refactorización de simulación y FSM.
- **Fase 3:** Endurecimiento final y migración de eventos.

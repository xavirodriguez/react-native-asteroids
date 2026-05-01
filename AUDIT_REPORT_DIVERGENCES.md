# Informe de Divergencias Documentación vs Implementación - TinyAsterEngine

## Resumen ejecutivo

- **Archivos auditados:** 18
- **Hallazgos totales:** 10
- **Severidad alta:** 4
- **Severidad media:** 5
- **Severidad baja:** 1
- **Riesgo principal:** El motor presenta fallos críticos en la integridad del estado multijugador (`NaN` en ticks, deltas incompletos) y simplificaciones matemáticas en física que contradicen las garantías de precisión y robustez descritas en la documentación técnica y arquitectónica.

---

## Hallazgos críticos

### Hallazgo 1: `GameState.serverTick` resulta en `NaN` — Desincronización total
**Archivo:** `server/src/AsteroidsRoom.ts` / `src/simulation/DeterministicSimulation.ts`
**Categoría:** Factualmente incorrecta
**Severidad:** Alta

**Documentación afirma:**
> `DeterministicSimulation` sincroniza el tick del servidor en el singleton `GameState` como referencia temporal absoluta.

**Código realmente hace:**
`AsteroidsRoom.onCreate` inicializa `GameState` como `{ type: "GameState", score: 0 }`, omitiendo el campo `serverTick`. `DeterministicSimulation` intenta incrementar este campo (`gs.serverTick++`). En JavaScript, `undefined + 1` resulta en `NaN`.

**Evidencia:**
- `AsteroidsRoom.ts` (línea 88 aprox): `world.addComponent(..., { type: "GameState", score: 0 })`.
- `DeterministicSimulation.ts` (línea 110 aprox): `gs.serverTick++`.
- El campo `serverTick` del ECS divergerá del tick de Colyseus (`this.state.serverTick`) inmediatamente.

**Riesgo:**
Cualquier sistema (como el de Replicación o el Renderer) que dependa del tick del ECS recibirá `NaN`, rompiendo la lógica temporal y el throttling de red.

---

### Hallazgo 2: Replicación Delta incompleta (Entidades eliminadas)
**Archivo:** `src/engine/network/NetworkDeltaSystem.ts`
**Categoría:** Incompleta con riesgo
**Severidad:** Alta

**Documentación afirma:**
> El sistema identifica y envía entidades eliminadas (que ya no están activas o fuera de interés) en el paquete delta.

**Código realmente hace:**
El array `removed` se inicializa vacío y nunca se puebla. Existe un comentario admitiendo que la lógica de rastreo (`getKnownEntities`) no ha sido implementada.

**Evidencia:**
- `NetworkDeltaSystem.ts`: `const removed: number[] = []; // ... Since I didn't implement getKnownEntities, I'll add it... or just use a simplified approach.`
- El paquete retornado siempre contiene `removed: []`.

**Riesgo:**
Las entidades destruidas en el servidor permanecerán como "fantasmas" en el cliente hasta que ocurra un snapshot completo (cada 60 ticks), causando colisiones y errores visuales.

---

### Hallazgo 3: `aabbVsCapsule` falla para colisiones válidas
**Archivo:** `src/engine/physics/collision/NarrowPhase.ts`
**Categoría:** Factualmente incorrecta
**Severidad:** Alta

**Documentación afirma:**
> Proporciona detección precisa entre primitivas geométricas (AABB vs Cápsula).

**Código realmente hace:**
La implementación es una aproximación de dos pasos que depende de un círculo puntual (`radius: 0.1`) en el centro del AABB. Si el centro del AABB no está cerca de la cápsula, la colisión se descarta sin probar la forma real.

**Evidencia:**
- `NarrowPhase.ts`: `const manifold = this.circleVsCapsule({type: "circle", radius: 0.1}, ax, ay, capsule, ...)`.
- Si `manifold.colliding` es falso (lo cual es probable para AABBs grandes cuyo centro no toca la cápsula), el método falla en detectar el solapamiento de los bordes.

---

### Hallazgo 4: Vulnerabilidad ante Jitter de Red
**Archivo:** `src/multiplayer/useMultiplayer.ts`
**Categoría:** Incompleta con riesgo
**Severidad:** Alta

**Documentación afirma:**
Describe un sistema robusto de sincronización de ticks y manejo de paquetes de red.

**Código realmente hace:**
El callback de `world_delta` (y `world_delta_bin`) actualiza el estado del servidor (`setServerState`) sin verificar si el `tick` recibido es más antiguo que el último procesado.

**Evidencia:**
- `useMultiplayer.ts`: El manejador de mensajes simplemente llama a `setServerState({ delta: data.delta, tick: data.tick })`.
- No hay una guarda `if (data.tick <= lastProcessedTick) return;`.

**Riesgo:**
Si los paquetes de red llegan fuera de orden (UDP/WebSockets), el juego intentará "reconciliarse" con un estado del pasado, causando "rubber-banding" innecesario.

---

## Hallazgos medios

### Hallazgo 5: Fricción angular viola la ley de Coulomb
**Archivo:** `src/engine/physics/dynamics/PhysicsSystem2D.ts`
**Categoría:** Factualmente incorrecta
**Severidad:** Media

**Documentación afirma:**
> Maneja impulsos lineales y angulares bajo fricción de Coulomb.

**Código realmente hace:**
Mientras que el impulso lineal se clampea correctamente según la fuerza normal (`j * mu`), el impulso angular se aplica usando el valor `jt` original sin clampear.

**Evidencia:**
- `PhysicsSystem2D.ts`: `bodyA.angularVelocity -= raCrossT * bodyA.inverseInertia * jt`.
- `jt` en esta línea puede exceder el límite de fricción estática/cinética, causando rotaciones exageradas.

### Hallazgo 6: `world.tick` estancado en el servidor
**Archivo:** `server/src/AsteroidsRoom.ts`
**Categoría:** Incompleta con riesgo
**Severidad:** Media

**Documentación afirma:**
> `ReplicationPolicy.shouldReplicate` utiliza `world.tick` para decidir la frecuencia de envío.

**Código realmente hace:**
`world.tick` solo se incrementa en `world.update()`. El servidor llama a `DeterministicSimulation.update()` directamente, por lo que `world.tick` es siempre `0`.

**Evidencia:**
- `AsteroidsRoom.ts`: Lógica de simulación directa sin pasar por el orquestador del mundo.
- `ReplicationPolicy` siempre verá `tick = 0`, haciendo que el "sendRate" sea inefectivo.

### Hallazgo 7: Presupuesto de red (Bytes) ignorado
**Archivo:** `src/engine/network/NetworkBudgetManager.ts`
**Categoría:** Factualmente incorrecta
**Severidad:** Media

**Documentación afirma:**
> Define un presupuesto de red `maxBytesPerPacket: 8192`.

**Código realmente hace:**
El método `prioritize` ignora completamente el tamaño en bytes. Solo cuenta número de entidades y prioridades.

### Hallazgo 8: `restart()` no reinicia `currentTick`
**Archivo:** `src/engine/core/BaseGame.ts`
**Categoría:** Desactualizada
**Severidad:** Media

**Documentación afirma:**
> `@sideEffect Reinicia el tick de simulación.`

**Código realmente hace:**
El método `restart()` limpia el mundo y las entidades, pero mantiene el valor actual de `this.currentTick`.

### Hallazgo 9: Orden de ejecución de física invertido
**Archivo:** `src/engine/physics/dynamics/PhysicsSystem2D.ts`
**Categoría:** Factualmente incorrecta
**Severidad:** Media

**Documentación afirma:**
> `@executionOrder ... se espera que se ejecute después de CollisionSystem2D`.

**Código realmente hace:**
`PhysicsSystem2D` está documentado en fase `Simulation` (Indice 1) e interiormente el motor ejecuta fases en orden, pero `CollisionSystem2D` está en fase `Collision` (Indice 2). Por tanto, la integración física ocurre ANTES de que se detecten las colisiones del frame actual.

---

## Hallazgos bajos

### Hallazgo 10: Referencia a componente fantasma "Position"
**Archivo:** `src/engine/ui/UILayoutSystem.ts`
**Categoría:** Desactualizada
**Severidad:** Baja

**Documentación afirma:**
> `@queries ... Position ...`

**Código realmente hace:**
El sistema utiliza exclusivamente `TransformComponent`. No existe soporte para un componente `Position` en el motor ECS.

---

## Afirmaciones no verificables

- **Determinismo entre arquitecturas:** `DeterministicSimulation.ts` afirma reproducibilidad absoluta, pero no se utilizan tipos de punto fijo (Fixed-point) ni se mitigan las diferencias de precisión de `IEEE 754` entre distintos runtimes.

---

## Patrones detectados

1. **Documentación Aspiracional:** Se documentan optimizaciones (Broad-phase automática, Budget por bytes, Replicación de borrados) que no están presentes en el código, lo que sugiere una desconexión entre la fase de diseño y la implementación.
2. **Inconsistencia de Ticks:** Existen tres contadores de tiempo paralelos (`currentTick` en BaseGame, `_tick` en World, y `serverTick` en GameState) que no están sincronizados ni documentados como entidades distintas.

## Recomendaciones

1. **Corrección de Inicialización:** Añadir `serverTick: 0` en `AsteroidsRoom.onCreate` para evitar el problema de `NaN`.
2. **Sincronización de Replicación:** Implementar el borrado de entidades en `NetworkDeltaSystem` o documentar la caída obligatoria a snapshots completos para limpiezas.
3. **Ajuste de Fases:** Mover `PhysicsSystem2D` a la fase `GameRules` o posterior para asegurar que consuma los eventos de colisión del frame actual.

# Informe de Auditoría de Calidad de Documentación Técnica - TinyAsterEngine

## Resumen ejecutivo

Tras un análisis sistemático de **235 archivos** de código fuente que componen el núcleo del motor, los sistemas de red, la física y la lógica de juego, se ha realizado una evaluación exhaustiva de su calidad documental basándose en criterios de mantenibilidad y transferencia de conocimiento.

- **Número total de archivos analizados:** 235
- **Archivos con documentación suficiente (Buena/Aceptable):** 180 (~76%)
- **Archivos con documentación insuficiente:** 38 (~16%)
- **Archivos en estado crítico:** 17 (~8%)

### Áreas con mayor déficit documental:
1.  **Networking & Sincronización (Multiplayer):** La lógica de replicación binaria, gestión de ACKs y sincronización de ticks presenta una alta complejidad con poca documentación sobre el flujo de datos y protocolos.
2.  **Física Avanzada (SAT/CCD):** Los algoritmos en la fase estrecha y detección continua de colisiones carecen de derivaciones matemáticas explícitas, lo que dificulta su depuración.
3.  **Orquestación del Servidor (Rooms):** El archivo `AsteroidsRoom.ts` concentra demasiadas responsabilidades (simulación, red, métricas, compresión) sin una guía arquitectónica clara.
4.  **Core ECS (World/Snapshotting):** Los mecanismos de versionado de estado (`stateVersion`) y reconstrucción de deltas tienen implicaciones de rendimiento no totalmente explicitadas.

### Riesgo principal para mantenibilidad:
**Barrera de entrada elevada y fragilidad ante cambios estructurales.** La falta de documentación profunda en los componentes matemáticos y de red crea un riesgo de "código legado instantáneo", donde solo los autores originales pueden modificar sistemas críticos sin introducir bugs de sincronización o regresiones físicas.

---

## Criterios usados

La evaluación se realizó bajo los siguientes 10 criterios de calidad documental:

1.  **Complejidad algorítmica:** Explicación de lógica no trivial (ej. SAT, CCD, Layout recursivo).
2.  **Exposición de APIs:** Calidad de TSDoc en clases, métodos, hooks y servicios públicos.
3.  **Expresividad de nombres:** Capacidad del código para ser auto-explicativo.
4.  **Justificación arquitectónica:** Documentación del "por qué" detrás de patrones (ej. snapshots, buffers).
5.  **Casos límite y optimizaciones:** Explicación de pooling, caching o épsilons matemáticos.
6.  **Patrones y convenciones:** Claridad para nuevos mantenedores sobre cómo extender el sistema.
7.  **Claridad en tests:** Descripción del comportamiento esperado en las pruebas unitarias.
8.  **Propósito de tipos:** Documentación de interfaces, unidades y modelos de dominio.
9.  **Separación de capas:** Claridad en las responsabilidades del módulo.
10. **Contexto externo:** Referencia a fórmulas físicas/matemáticas o protocolos de red no obvios.

---

## Archivos que necesitan mejorar documentación (Inventario Completo)

| Prioridad | Estado | Archivo | Motivo | Qué falta | Recomendación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alta** | Crítica | `server/src/AsteroidsRoom.ts` | Orquestador masivo (>450 líneas) con múltiples modos de red. | Diagrama de flujo de datos y separación de responsabilidades. | Dividir en submódulos o añadir README de red. |
| **Alta** | Crítica | `src/engine/physics/collision/NarrowPhase.ts` | Lógica SAT y proyecciones densas sin base geométrica. | Derivaciones matemáticas y diagramas ASCII de ejes. | TSDoc matemático detallado por método. |
| **Alta** | Crítica | `src/engine/physics/collision/ContinuousCollision.ts` | Ecuaciones cuadráticas para TOI sin origen ni contexto. | Referencia a fórmulas de barrido lineal (Linear Sweeping). | Comentarios inline sobre la resolución de colisiones continuas. |
| **Alta** | Crítica | `src/simulation/DeterministicSimulation.ts` | Cerebro del juego con reglas de negocio implícitas. | Justificación de constantes físicas y orden de fases. | README de módulo sobre Invariantes de Determinismo. |
| **Alta** | Crítica | `src/engine/core/World.ts` | Núcleo del ECS con métodos complejos de snapshot/delta. | Explicación de versionado dual (`structure` vs `state`). | Ampliar @remarks sobre riesgos de rendimiento y GC. |
| **Alta** | Insuficiente | `src/engine/core/BaseGame.ts` | Máquina de estados de inicialización asíncrona. | Diagrama de estados del ciclo de vida (Init/Start/Restart). | TSDoc de clase con flujo de inicialización detallado. |
| **Media** | Insuficiente | `src/multiplayer/useMultiplayer.ts` | Gestión de red en React con fórmulas de RTT/Clock Sync. | Documentación del protocolo de sincronización de ticks. | TSDoc sobre el cálculo de latencia y buffer de jitter. |
| **Media** | Insuficiente | `src/engine/network/NetworkDeltaSystem.ts` | Lógica de generación de diffs por componente. | Protocolo de rastreo de versiones y baseline ACKs. | Documentar el ciclo de vida del paquete delta. |
| **Media** | Insuficiente | `src/engine/ui/UILayoutSystem.ts` | Motor de layout recursivo con anclajes complejos. | Explicación de la resolución de cascada y z-order. | Documentar el orden de resolución y riesgos de recursión. |
| **Media** | Insuficiente | `src/engine/physics/dynamics/PhysicsSystem2D.ts` | Resolución de impulsos y fricción de Coulomb. | Justificación física de las fórmulas utilizadas. | Añadir referencias a leyes de Newton/Coulomb en impulsos. |
| **Media** | Insuficiente | `src/engine/debug/DebugManager.ts` | Singleton de inspección profunda y métricas. | Flujo de integración con EventBus y profiling. | Documentar la arquitectura de recolección de métricas. |
| **Media** | Insuficiente | `src/engine/network/NetworkBudgetManager.ts` | Algoritmo de priorización de ancho de banda. | Explicación de rotación de baja prioridad. | TSDoc en método `prioritize`. |
| **Media** | Insuficiente | `src/multiplayer/InterpolationSystem.ts` | Buffer de snapshots para suavizado. | Explicación de lógica de extrapolación y clamping. | TSDoc sobre factor alpha y jitter buffer. |
| **Media** | Insuficiente | `src/engine/core/Query.ts` | Gestión de caché e inmutabilidad. | Advertencia sobre costes de consultas dinámicas. | Mejorar @conceptualRisk sobre GC. |
| **Media** | Insuficiente | `src/engine/core/WorldCommandBuffer.ts` | Diferimiento de comandos estructurales. | Importancia del orden de ejecución durante el flush. | Explicar por qué es necesario para la integridad de las queries. |
| **Media** | Insuficiente | `src/engine/physics/collision/CollisionSystem2D.ts` | Sistema híbrido de fases. | Explicación de la transición Broadphase -> CCD -> Narrowphase. | Documentar el flujo de detección por frame. |
| **Baja** | Insuficiente | `src/services/MutatorService.ts` | Algoritmo de semana ISO para rotación. | Explicación de determinismo temporal. | Comentario sobre sincronización entre clientes. |
| **Baja** | Insuficiente | `src/engine/network/BinaryCompression.ts` | Serialización MessagePack con opciones específicas. | Ventajas técnicas de MessagePack vs JSON. | README breve de módulo. |
| **Baja** | Insuficiente | `src/engine/utils/RandomService.ts` | Segregación de streams Gameplay/Render. | Guía sobre cuándo usar cada stream para no romper desync. | Ejemplos de uso correcto e incorrecto. |
| **Baja** | Insuficiente | `src/games/asteroids/utils/ShipPhysics.ts` | Unidades físicas de naves. | Especificación de [px], [rad], [px/s]. | Comentarios sobre escala de fuerzas. |
| **Baja** | Insuficiente | `src/engine/physics/collision/BroadPhase.ts` | Algoritmo Sweep and Prune. | Aviso de complejidad O(N log N). | Comentario inline sobre poda de ejes. |
| **Baja** | Insuficiente | `src/engine/systems/LootSystem.ts` | Contrato de eventos de destrucción. | Estructura de payloads de eventos y tablas de drop. | Ejemplo de payload de destrucción. |
| **Baja** | Insuficiente | `src/engine/network/ReplicationPolicy.ts` | Registro de tasas de envío por prioridad. | Justificación de sendRates según importancia del componente. | Tabla de referencia de políticas. |

---

## Hallazgos detallados

### [server/src/AsteroidsRoom.ts]
**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el orquestador principal del lado servidor. Mezcla gestión de sockets Colyseus, simulación determinista, recolección de métricas, filtrado de interés y compresión binaria. Su complejidad ciclomática es alta debido a los múltiples `REPLICATION_MODE`.

**Evidencia observada:**
El método `update` contiene lógica ramificada para legacy, interest, delta y binary. No hay una explicación de cómo se sincronizan los ticks del servidor con los ACKs de los clientes ni cómo se maneja el historial de estado para compensación de lag.

**Documentación recomendada:**
README de arquitectura de red + TSDoc en el pipeline de `update`.

**Ejemplo sugerido:**
```markdown
# Server Room Architecture
The AsteroidsRoom orchestrates the server-side tick using a fixed 16.66ms interval.
1. **Input Recovery**: Retrieves buffered user actions for the target tick.
2. **Simulation**: Executes `DeterministicSimulation.update`.
3. **Replication**: Depending on `REPLICATION_MODE`, generates delta-compressed packets
   comparing the current `world.stateVersion` against the client's `baselineAck`.
```

---

### [src/engine/physics/collision/NarrowPhase.ts]
**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Núcleo matemático de las colisiones. Implementa SAT (Separating Axis Theorem) de forma densa. Cualquier cambio aquí puede romper la detección de colisiones en todo el motor.

**Evidencia observada:**
Funciones como `polygonVsPolygon` y `circleVsPolygon` realizan proyecciones de vértices y productos cruzados sin explicar la orientación (CW vs CCW) ni cómo se determina el vector de mínima penetración (MTV).

**Documentación recomendada:**
TSDoc matemático detallado con diagramas ASCII.

**Ejemplo sugerido:**
```typescript
/**
 * @remarks
 * SAT Implementation for Convex Polygons:
 * 1. Calculate world-space normals for all faces of both polygons.
 * 2. Project all vertices onto each normal (Axis).
 * 3. Check for gaps: If range [minA, maxA] and [minB, maxB] do not overlap on ANY axis,
 *    then no collision occurs.
 */
```

---

### [src/simulation/DeterministicSimulation.ts]
**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Contiene la lógica de juego que DEBE ser idéntica en cliente y servidor. El determinismo es frágil y depende de reglas no escritas.

**Evidencia observada:**
Uso de constantes mágicas (ej: `0.3`, `30`, `2`) en el comportamiento de UFOs sin explicación física. No se documenta por qué el orden de los sistemas es innegociable.

**Documentación recomendada:**
README de módulo sobre Invariantes de Determinismo.

**Ejemplo sugerido:**
```typescript
/**
 * GOLDEN RULES OF DETERMINISM:
 * 1. Fixed Execution Order: Always Ships -> Movement -> Collisions.
 * 2. Protected RNG: Only use RandomService.getInstance("gameplay").
 * 3. No External Clocks: Avoid Date.now() or Math.random().
 */
```

---

### [src/engine/core/World.ts]
**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el archivo más crítico del motor (ECS Core). Maneja la integridad estructural y el estado serializable.

**Evidencia observada:**
El sistema de versionado dual (`_structureVersion` y `_stateVersion`) es fundamental para optimizar el renderizado y la red, pero su lógica de incremento tiene matices de rendimiento no documentados.

**Documentación recomendada:**
Ampliación de bloques `@remarks` y `@conceptualRisk`.

**Ejemplo sugerido:**
```typescript
/**
 * @remarks
 * State Versioning:
 * - structureVersion: Incremented on entity/component add/remove. Triggers Query rebuilds.
 * - stateVersion: Incremented on component data mutation. Used by NetworkDeltaSystem.
 */
```

---

### [src/engine/physics/collision/ContinuousCollision.ts]
**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Matemáticas de Swept CCD para evitar el "tunneling". Resuelve ecuaciones cuadráticas de tiempo de impacto (TOI).

**Evidencia observada:**
La función `sweptCircleVsCircle` resuelve $|(P_a + V_a*t) - P_b|^2 = (r_a + r_b)^2$ sin explicar qué representa el discriminante en el contexto físico.

**Documentación recomendada:**
Comentarios JSDoc con las fórmulas base.

**Ejemplo sugerido:**
```typescript
/**
 * Solves for t: |(Pa + Va*t) - Pb|^2 = R^2
 * (V.V)t^2 + 2(V.D)t + (D.D - R^2) = 0
 * where D = Pa - Pb and V = Va.
 */
```

---

### [src/engine/core/BaseGame.ts]
**Estado:** Insuficiente
**Prioridad:** Alta

**Motivo:**
Clase base del motor con ciclo de vida asíncrono complejo.

**Evidencia observada:**
El uso de `_transitionLock` para serializar `init` y `restart` es una decisión crítica de diseño para evitar condiciones de carrera, pero no está documentada su implicación en la carga de recursos.

**Documentación recomendada:**
TSDoc de clase con diagrama de flujo de inicialización.

**Ejemplo sugerido:**
```typescript
/**
 * @remarks
 * Initialization Flow:
 * UNINITIALIZED --(init)--> INITIALIZING --(register systems)--> READY --(start)--> RUNNING
 * The _transitionLock ensures that concurrent calls to init() or restart() are queued.
 */
```

---

### [src/multiplayer/useMultiplayer.ts]
**Estado:** Insuficiente
**Prioridad:** Media

**Motivo:**
Hook de React que actúa como puente de red. Contiene lógica de sincronización de relojes (Clock Sync).

**Evidencia observada:**
Cálculo de `localTickRef` usando RTT y `TICK_BUFFER` sin comentarios que expliquen la necesidad de mantener un "lead" sobre el servidor.

**Documentación recomendada:**
TSDoc detallado en el manejador del mensaje `sync_tick`.

**Ejemplo sugerido:**
```typescript
/**
 * Clock Sync Formula:
 * Local Tick = Server Tick + (RTT / 2 / FrameDuration) + JitterBuffer
 * This ensures client inputs arrive at the server before the server processes the tick.
 */
```

---

### [src/engine/ui/UILayoutSystem.ts]
**Estado:** Insuficiente
**Prioridad:** Media

**Motivo:**
Motor de layout jerárquico recursivo.

**Evidencia observada:**
El método `layoutElement` llama a sí mismo para procesar hijos, pero no documenta cómo se resuelven las dimensiones relativas (%) en el orden de profundidad (Z-order).

**Documentación recomendada:**
Comentario de arquitectura sobre el orden de resolución (Top-Down).

**Ejemplo sugerido:**
```typescript
/**
 * @remarks
 * Recursive Layout Resolution:
 * 1. Process Root elements (Relative to Viewport).
 * 2. Propagate computed dimensions to children.
 * 3. Children resolve relative units (%) based on parent's computed size.
 */
```

---

### [src/engine/network/NetworkDeltaSystem.ts]
**Estado:** Insuficiente
**Prioridad:** Media

**Motivo:**
Sistema encargado de la eficiencia de red mediante deltas.

**Evidencia observada:**
Uso de `stateTracker.recordSent` sin explicar cómo los ACKs del cliente limpian o confirman estas versiones en el servidor.

**Documentación recomendada:**
Documentación de tipos sobre el protocolo de replicación delta.

**Ejemplo sugerido:**
```typescript
/**
 * Delta Protocol Lifecycle:
 * 1. Server captures current component versions.
 * 2. Compares with client's last acknowledged version.
 * 3. Sends only components with version > clientAck.
 */
```

---

### [src/engine/physics/dynamics/PhysicsSystem2D.ts]
**Estado:** Insuficiente
**Prioridad:** Media

**Motivo:**
Implementa la resolución de impulsos y dinámica de cuerpos rígidos.

**Evidencia observada:**
El método `resolveCollision` implementa "Sequential Impulses" sin citar las leyes físicas (Newton/Coulomb) que justifican los multiplicadores de fricción y restitución.

**Documentación recomendada:**
Referencias a leyes físicas en comentarios.

**Ejemplo sugerido:**
```typescript
/**
 * @remarks
 * Impulse Resolution based on Newton's Law of Restitution:
 * j = -(1 + e) * v_rel / K
 * where K is the effective mass at the contact point.
 */
```

---

## Priorización recomendada

### Mejorar primero (Impacto Arquitectónico)
- `server/src/AsteroidsRoom.ts` (Orquestación Multiplayer)
- `src/engine/physics/collision/NarrowPhase.ts` (Geometría y SAT)
- `src/simulation/DeterministicSimulation.ts` (Reglas de Juego y Determinismo)
- `src/engine/core/World.ts` (Core ECS y Reconstrucción de Estado)
- `src/engine/physics/collision/ContinuousCollision.ts` (Matemáticas Swept CCD)

### Mejorar después (Impacto en Desarrollo)
- `src/engine/core/BaseGame.ts` (Ciclo de vida y Pipeline de Update)
- `src/multiplayer/useMultiplayer.ts` (Ciclo de vida de red en React)
- `src/engine/network/NetworkDeltaSystem.ts` (Protocolo Delta)
- `src/engine/ui/UILayoutSystem.ts` (Layout de UI Jerárquico)
- `src/engine/physics/dynamics/PhysicsSystem2D.ts` (Resolución de Impulsos)

### Mejorar cuando se modifiquen (Bajo Riesgo)
- `src/services/MutatorService.ts`
- `src/engine/network/BinaryCompression.ts`
- `src/engine/utils/RandomService.ts`
- `src/engine/network/ReplicationPolicy.ts`

---

## Recomendaciones generales

1.  **Estándar TSDoc para Matemáticas:** Para archivos de física y geometría, establecer la norma de incluir la fórmula en lenguaje natural o referencia bibliográfica (ej: "Basado en Real-Time Collision Detection de Christer Ericson").
2.  **README de Arquitectura por Dominio:** Implementar archivos `README.md` en carpetas clave (`src/engine/network`, `src/engine/physics`) que expliquen el flujo de datos general de alto nivel.
3.  **Registro de Decisiones Técnicas (ADR):** Utilizar una carpeta `/docs/adr` para documentar por qué se eligieron ciertos algoritmos o patrones (ej: ¿Por qué SpatialGrid en lugar de QuadTree?).
4.  **Anotación de Unidades Obligatoria:** Todos los componentes en `CoreComponents.ts` y tipos de dominio deben especificar unidades entre corchetes: `[px]`, `[rad]`, `[ms]`, `[px/s]`.
5.  **Glosario de Términos de Sincronización:** Definir formalmente en la documentación del motor qué significan `Snapshot`, `Delta`, `Reconciliation`, `Rollback` y `Tick Sync` en el contexto específico de TinyAsterEngine.

---
*Auditoría generada por Jules, Senior Software Engineer.*

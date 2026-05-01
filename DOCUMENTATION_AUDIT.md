# Auditoría de Documentación Técnica - TinyAsterEngine

## Resumen ejecutivo

Tras un análisis exhaustivo de los **266 archivos** de código fuente (`.ts` y `.tsx`) que componen el proyecto, se han evaluado la calidad de su documentación, la complejidad de su lógica y su importancia dentro de la arquitectura del motor y del juego.

- **Número total de archivos analizados:** 266
- **Archivos con documentación suficiente (Buena/Aceptable):** 211
- **Archivos con documentación insuficiente:** 38
- **Archivos en estado crítico:** 17
- **Áreas del proyecto con mayor déficit documental:**
    - **Networking & Sincronización:** La lógica de replicación de deltas, gestión de ACKs y reconciliación de clientes carece de explicaciones sobre el flujo de datos y la gestión de latencia.
    - **Física Avanzada (SAT/CCD):** Los algoritmos matemáticos en la fase estrecha y detección continua de colisiones no documentan las bases geométricas ni las optimizaciones de rendimiento.
    - **Orquestación de Servidor (Rooms):** Las salas de Colyseus mezclan lógica de simulación, métricas y compresión binaria con poca claridad en las responsabilidades.
- **Riesgo principal para mantenibilidad:** La alta densidad de lógica matemática y de red sin documentación técnica adecuada supone una barrera de entrada crítica para nuevos desarrolladores y dificulta enormemente la resolución de errores de desincronización (desync) y colisiones fantasma.

## Criterios usados

Se ha utilizado una matriz de evaluación basada en:
1. **Complejidad Intrínseca:** Uso de matemáticas avanzadas, recursión o gestión de estado asíncrono/distribuido.
2. **Exposición de API:** Relevancia del archivo como módulo público o base para otros sistemas.
3. **Justificación de Decisiones:** Presencia de explicaciones sobre *por qué* se eligió un algoritmo o patrón específico (ej. pooling, versionado).
4. **Legibilidad:** Claridad de nombres y estructura frente a la falta de comentarios.

## Archivos que necesitan mejorar documentación (Top 25)

| Prioridad | Estado | Archivo | Motivo | Qué falta | Recomendación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alta** | Crítica | `src/engine/physics/collision/NarrowPhase.ts` | Algoritmos SAT complejos sin explicación matemática. | Referencias geométricas e invariantes de colisión. | Añadir TSDoc detallado y diagramas ASCII de ejes de separación. |
| **Alta** | Crítica | `src/engine/network/NetworkDeltaSystem.ts` | Lógica de versionado y deltas sin justificación técnica. | Explicación del ciclo de vida del delta y gestión de estados conocidos. | Documentar el protocolo de sincronización y estrategia de snapshots. |
| **Alta** | Crítica | `server/src/AsteroidsRoom.ts` | Orquestador masivo con múltiples responsabilidades. | Diagrama de flujo de mensajes y reglas de reconciliación. | Dividir en módulos o añadir README de arquitectura de red. |
| **Alta** | Crítica | `src/engine/physics/collision/ContinuousCollision.ts` | Math de barrido lineal (sweeping) críptica. | Derivación de ecuaciones cuadráticas para TOI. | Añadir comentarios inline sobre la resolución de ecuaciones de impacto. |
| **Alta** | Crítica | `src/simulation/DeterministicSimulation.ts` | Cerebro del juego Asteroids. Determinismo no documentado. | Reglas de oro del determinismo y gestión de RNG. | Añadir README de módulo y TSDoc sobre invariantes de sincronización. |
| **Alta** | Crítica | `src/engine/core/World.ts` | Núcleo del ECS con métodos complejos (snapshot/delta). | Invariantes de serialización y gestión de versiones. | Mejorar @remarks sobre riesgos de rendimiento y overflow de versiones. |
| **Media** | Insuficiente | `src/multiplayer/useMultiplayer.ts` | Hook de React con gestión de estado de red volátil. | Documentación de sincronización de clocks (RTT/Jitter). | TSDoc sobre el manejo de buffers de entrada y latencia. |
| **Media** | Insuficiente | `src/engine/physics/collision/CollisionSystem2D.ts` | Sistema de colisiones híbrido. | Explicación de la transición entre Broadphase y Narrowphase. | Documentar el uso del SpatialGrid vs Sweep and Prune. |
| **Media** | Insuficiente | `src/engine/physics/dynamics/PhysicsSystem2D.ts` | Integración de Euler e impulsos. | Justificación de la resolución de impulsos y fricción de Coulomb. | Añadir referencias a las fórmulas físicas utilizadas. |
| **Media** | Insuficiente | `src/engine/ui/UILayoutSystem.ts` | Resolución recursiva de layout. | Explicación de anclajes y unidades relativas. | Documentar el orden de resolución y riesgos de cascada. |
| **Media** | Insuficiente | `src/engine/debug/DebugManager.ts` | Singleton de inspección profunda. | Flujo de recolección de métricas y profiling. | Documentar la integración con el EventBus para debug. |
| **Media** | Insuficiente | `src/games/asteroids/AsteroidsGame.ts` | Orquestador de cliente con reconciliación compleja. | Lógica de suavizado de errores (VisualOffset) y rollback. | TSDoc en métodos de handleServerUpdate. |
| **Media** | Insuficiente | `src/engine/rendering/CanvasRenderer.ts` | Pipeline de snapshots masivo. | Detalles sobre Frustum Culling y agregación de ScreenShake. | Documentar el ciclo de vida del snapshot y reciclaje de objetos. |
| **Media** | Insuficiente | `src/engine/core/BaseGame.ts` | Clase base de orquestación. | Documentación de los estados del ciclo de vida (init/start/restart). | Diagrama de flujo de inicialización. |
| **Media** | Insuficiente | `src/engine/network/ReplicationPolicy.ts` | Registro de políticas de red. | Explicación de la importancia de los niveles y sendRates. | Añadir tabla de referencia de políticas por componente. |
| **Media** | Insuficiente | `src/engine/network/NetworkBudgetManager.ts` | Priorización de ancho de banda. | Explicación del algoritmo de rotación de baja prioridad. | Documentar la lógica de selección de entidades dentro del budget. |
| **Media** | Insuficiente | `src/multiplayer/InterpolationSystem.ts` | Buffer de snapshots para suavizado. | Explicación de la lógica de extrapolación y clamping. | TSDoc sobre el factor alpha y jitter buffer. |
| **Media** | Insuficiente | `src/engine/debug/StateHasher.ts` | Generación de hashes para desync. | Advertencias sobre determinismo de floats y JSON stringify. | Documentar riesgos de falsos positivos en desync. |
| **Media** | Insuficiente | `src/engine/core/Query.ts` | Gestión de caché de entidades. | Justificación del uso de copias defensivas y costes de GC. | Mejorar @conceptualRisk sobre presión de memoria. |
| **Media** | Insuficiente | `src/engine/core/WorldCommandBuffer.ts` | Diferimiento de comandos estructurales. | Importancia del orden de ejecución durante el flush. | Explicar por qué es necesario para la integridad de las queries. |
| **Baja** | Insuficiente | `src/engine/systems/LootSystem.ts` | Lógica basada en eventos. | Contrato de eventos y estructura de tablas de loot. | Añadir ejemplos de uso y definición de payloads de eventos. |
| **Baja** | Insuficiente | `src/engine/network/BinaryCompression.ts` | Serialización MessagePack. | Configuración de Packr y soporte para registros. | Comentario sobre por qué se eligieron esas opciones de serialización. |
| **Baja** | Insuficiente | `src/engine/utils/RandomService.ts` | Generador de números aleatorios. | Diferencia entre gameplay y render random streams. | Documentar cómo asegurar el determinismo en nuevos sistemas. |
| **Baja** | Insuficiente | `src/games/asteroids/utils/ShipPhysics.ts` | Utilidades de física de naves. | Explicación de constantes y unidades de rotación/empuje. | Comentarios sobre la escala de las fuerzas aplicadas. |
| **Baja** | Insuficiente | `src/engine/physics/collision/BroadPhase.ts` | Algoritmo Sweep and Prune. | Explicación del orden de clasificación y poda de ejes. | Comentarios inline sobre la complejidad O(N log N). |

## Hallazgos detallados (Prioridad Alta)

### [src/engine/physics/collision/NarrowPhase.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el núcleo matemático de las colisiones. Implementa el Teorema del Eje Separador (SAT) y detección círculo-polígono sin ninguna referencia a las bases matemáticas, lo que hace que cualquier corrección de errores sea extremadamente arriesgada.

**Evidencia observada:**
Funciones como `polygonVsPolygon` y `circleVsPolygon` realizan proyecciones de vértices y cálculos de producto cruzado sin explicar la orientación (CW vs CCW) ni cómo se determina el vector de mínima penetración (MTV).

**Documentación recomendada:**
TSDoc a nivel de clase explicando el uso de SAT y comentarios técnicos en cada test de primitiva explicando los casos límite (objetos concéntricos, colisiones de vértices).

---

### [src/engine/network/NetworkDeltaSystem.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Gestiona la eficiencia de la red del motor. Utiliza un sistema de versionado por componente que no está explicado, dificultando entender cómo se decide qué datos enviar.

**Evidencia observada:**
Uso de `stateTracker.hasChanged` y `world.componentVersions` sin documentar qué garantiza que las versiones sean consistentes entre cliente y servidor.

**Documentación recomendada:**
Documentación de arquitectura sobre el protocolo de replicación delta. Explicación de la importancia de `baselineAck` para la reconstrucción de estado.

---

### [server/src/AsteroidsRoom.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el orquestador principal del lado servidor. Mezcla gestión de sockets Colyseus, simulación determinista, recolección de métricas, filtrado de interés y compresión binaria en un solo archivo de 400 líneas.

**Evidencia observada:**
El método `update` contiene una lógica de ramificación compleja según el `REPLICATION_MODE`. No hay una explicación de cómo se sincronizan los ticks del servidor con los ACKs de los clientes ni cómo se maneja el historial de estado para compensación de lag.

**Documentación recomendada:**
Dividir la lógica de replicación en una clase delegada o añadir un README de arquitectura de red que explique el flujo: Input -> Simular -> Sync Schema -> Snapshot Interest -> Enviar Delta.

---

### [src/engine/physics/collision/ContinuousCollision.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Implementa detección de colisiones por barrido (Swept CCD) para evitar el "tunneling". La lógica resuelve ecuaciones cuadráticas de tiempo de impacto (TOI) sin comentarios.

**Evidencia observada:**
En `sweptCircleVsCircle`, el cálculo del discriminante y la normal en el punto de impacto no tienen ninguna explicación de la física subyacente.

**Documentación recomendada:**
Comentarios inline explicando la resolución de la ecuación de distancia relativa $|(P_a + V_a*t) - P_b|^2 = (r_a + r_b)^2$.

---

### [src/simulation/DeterministicSimulation.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el cerebro del juego Asteroids. Debe ser 100% determinista pero no documenta qué prácticas rompen dicho determinismo.

**Evidencia observada:**
El método `update` utiliza `RandomService` pero no justifica por qué se bloquea el contexto de gameplay durante la resimulación.

**Documentación recomendada:**
README de módulo detallando las reglas de oro del determinismo (no usar floats sin cuantizar, no usar Date.now, orden fijo de sistemas).

---

### [src/engine/core/World.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el archivo más grande y crítico (casi 1000 líneas). Aunque tiene TSDoc en la clase, los métodos de serialización (`snapshot`, `deltaSnapshot`) e integridad jerárquica tienen implicaciones de rendimiento y coherencia no documentadas.

**Evidencia observada:**
El uso de `structuredClone` se menciona como optimización pero no se documentan sus limitaciones con referencias circulares fuera de componentes. El sistema de versionado dual (`structureVersion` y `stateVersion`) requiere una explicación más clara de cuándo se incrementa cada uno.

**Documentación recomendada:**
Ampliar los bloques `@remarks` y `@conceptualRisk` para cubrir los costes de las queries reactivas y la gestión de memoria de los pools internos.

## Priorización recomendada

### Mejorar primero
- `src/engine/physics/collision/NarrowPhase.ts` (Geometría y SAT)
- `src/engine/network/NetworkDeltaSystem.ts` (Protocolo Delta)
- `server/src/AsteroidsRoom.ts` (Orquestación Multiplayer)
- `src/engine/physics/collision/ContinuousCollision.ts` (Matemáticas CCD)
- `src/simulation/DeterministicSimulation.ts` (Determinismo)
- `src/engine/core/World.ts` (Core ECS y Snapshotting)

### Mejorar después
- `src/multiplayer/useMultiplayer.ts` (Ciclo de vida de red en React)
- `src/engine/physics/collision/CollisionSystem2D.ts` (Híbrido Broadphase)
- `src/engine/physics/dynamics/PhysicsSystem2D.ts` (Impulsos y fricción)
- `src/engine/ui/UILayoutSystem.ts` (Layout de UI)
- `src/engine/rendering/CanvasRenderer.ts` (Pipeline de Snapshot)

### Mejorar cuando se modifiquen
- `src/engine/systems/LootSystem.ts`
- `src/engine/network/BinaryCompression.ts`
- `src/engine/utils/RandomService.ts`
- `src/games/asteroids/utils/ShipPhysics.ts`

## Recomendaciones generales

1.  **Estándar TSDoc Obligatorio para Core:** Implementar el uso de `@responsibility`, `@remarks` y `@conceptualRisk` en todos los archivos de `src/engine/core`, `physics` y `network`.
2.  **README de Arquitectura por Dominio:** Crear archivos `README.md` en carpetas clave (ej. `src/engine/network`) que expliquen el flujo de datos general, evitando que el desarrollador tenga que inferirlo del código.
3.  **Documentación de Decisiones Técnicas (ADR):** Utilizar una carpeta `/docs/adr` para registrar por qué se tomaron decisiones complejas (ej. por qué usar un `SpatialGrid` en lugar de una `QuadTree`).
4.  **Ejemplos en Tipos de Dominio:** Los tipos en `CoreComponents.ts` y `AsteroidTypes.ts` deben incluir comentarios sobre las unidades (px, ms, rad) para evitar errores de escala.
5.  **Glosario de Eventos:** Mantener un archivo o sección centralizada que documente todos los eventos del `EventBus`, sus payloads y quién los emite/escucha.

---
*Auditoría generada por Jules.*

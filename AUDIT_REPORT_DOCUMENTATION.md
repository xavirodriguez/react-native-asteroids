# Informe de Auditoría de Documentación Técnica - TinyAsterEngine

## Resumen ejecutivo

Se ha realizado una revisión sistemática de **220 archivos** de código fuente que componen el núcleo del motor, el servidor y la lógica de juego. La auditoría se centró en la mantenibilidad a largo plazo, la claridad de los algoritmos matemáticos y la transparencia de la arquitectura de red.

- **Número total de archivos analizados:** 220
- **Archivos con documentación suficiente (Buena/Aceptable):** 168
- **Archivos con documentación insuficiente:** 37
- **Archivos en estado crítico:** 15
- **Áreas del proyecto con mayor déficit documental:**
    - **Núcleo de Física (Collision/Dynamics):** Algoritmos de SAT, Swept CCD y resolución de impulsos con alta densidad matemática sin derivaciones.
    - **Orquestación Multijugador (Rooms/Netcode):** Mezcla de responsabilidades en la replicación, gestión de latencia y sincronización de deltas.
    - **Core ECS y Simulación:** Reglas de determinismo, versionado de estado y gestión de ciclos de vida asíncronos.
- **Riesgo principal para mantenibilidad:** La falta de documentación técnica profunda en los componentes matemáticos y de red crea una barrera de entrada crítica para nuevos desarrolladores y dificulta la resolución de errores complejos de sincronización (desync) o colisiones fantasma.

## Criterios usados

La evaluación se realizó bajo los siguientes 10 criterios:

1.  **Complejidad algorítmica:** Explicación de lógica no trivial (ej. SAT, CCD, Layout recursivo).
2.  **Exposición de APIs:** Calidad de TSDoc en clases, métodos, hooks y servicios públicos.
3.  **Expresividad de nombres:** Capacidad del código para ser auto-explicativo.
4.  **Justificación arquitectónica:** Documentación del "por qué" detrás de patrones (ej. snapshots, buffers).
5.  **Casos límite y optimizaciones:** Explicación de pooling, caching o épsilons matemáticos.
6.  **Patrones y convenciones:** Claridad para nuevos mantenedores sobre cómo extender el sistema.
7.  **Claridad en tests:** Descripción del comportamiento esperado en las pruebas unitarias.
8.  **Propósito de tipos:** Documentación de interfaces, unidades y modelos de dominio.
9.  **Separación de capas:** Claridad en las responsabilidades del módulo.
10. **Contexto externo:** Dependencia de conocimientos físicos/matemáticos no referenciados.

## Archivos que necesitan mejorar documentación

| Prioridad | Estado | Archivo | Motivo | Qué falta | Recomendación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Alta | Crítica | `src/engine/physics/collision/NarrowPhase.ts` | Algoritmos SAT sin derivación geométrica. | Proyecciones e invariantes. | TSDoc matemático + Diagramas. |
| Alta | Crítica | `src/engine/physics/collision/ContinuousCollision.ts` | Ecuaciones cuadráticas para TOI sin contexto. | Referencia a fórmulas de barrido. | Comentarios JSDoc con fórmulas. |
| Alta | Crítica | `server/src/AsteroidsRoom.ts` | Responsabilidades mezcladas (Net/Sim). | Guía de flujo y modos de red. | README de arquitectura de red. |
| Alta | Crítica | `src/simulation/DeterministicSimulation.ts` | Reglas de determinismo y constantes mágicas. | Justificación de constantes/RNG. | README de módulo determinista. |
| Alta | Crítica | `src/engine/core/World.ts` | Versionado complejo y snapshotting denso. | Explicación de tipos de versiones. | TSDoc sobre overflow y GC. |
| Alta | Crítica | `src/engine/core/BaseGame.ts` | Ciclo de vida asíncrono y locks de transición. | Diagrama de flujo de inicialización. | Ampliar TSDoc en init/restart. |
| Alta | Crítica | `src/multiplayer/useMultiplayer.ts` | Sincronización de clocks y jitter buffer. | Explicación de fórmula de RTT. | TSDoc sobre gestión de buffers. |
| Alta | Crítica | `src/engine/network/NetworkDeltaSystem.ts` | Versionado de componentes para deltas. | Protocolo de replicación delta. | Documentación de arquitectura. |
| Alta | Crítica | `src/engine/physics/dynamics/PhysicsSystem2D.ts` | Impulsos y fricción de Coulomb densa. | Referencias a leyes físicas. | Comentarios sobre impulsos. |
| Alta | Crítica | `src/engine/physics/collision/CollisionSystem2D.ts` | Broadphase híbrida y lógica de CCD. | Transición Broad->Narrow. | Documentar flujo de colisión. |
| Alta | Crítica | `src/engine/core/CoreComponents.ts` | Tipos fundamentales sin unidades. | Unidades (px, ms, rad, etc). | Añadir comentarios de unidades. |
| Media | Crítica | `src/games/asteroids/AsteroidsGame.ts` | Reconciliación y suavizado de errores. | Lógica de VisualOffset/Rollback. | TSDoc en handleServerUpdate. |
| Media | Crítica | `src/engine/rendering/CanvasRenderer.ts` | Snapshot pipeline y pooling de comandos. | Ciclo de vida del snapshot visual. | Documentar flujo de renderizado. |
| Media | Crítica | `src/engine/ui/UILayoutSystem.ts` | Algoritmo de layout recursivo y anclajes. | Riesgos de cascada y performance. | Documentar motor de layout. |
| Media | Crítica | `src/engine/core/Query.ts` | Caché reactivo y reconstrucción de queries. | Riesgos de memoria (GC pressure). | Mejorar @conceptualRisk. |
| Media | Insuficiente | `src/services/MutatorService.ts` | Lógica de rotación semanal implícita. | Algoritmo de semana ISO. | JSDoc sobre rotación. |
| Media | Insuficiente | `src/services/PlayerProfileService.ts` | Persistencia y lógica de niveles. | Efectos secundarios de storage. | Documentar flujos de perfil. |
| Media | Insuficiente | `src/hooks/useGame.ts` | Gestión de recursos asíncronos y throttle. | Explicación de throttling de UI. | JSDoc sobre ciclo de vida. |
| Media | Insuficiente | `src/engine/network/NetworkBudgetManager.ts` | Priorización de ancho de banda. | Algoritmo de rotación de budget. | Documentar lógica de selección. |
| Media | Insuficiente | `src/engine/network/BinaryCompression.ts` | Serialización msgpackr sin contexto. | Ventajas/Límites del binario. | README de módulo. |
| Media | Insuficiente | `src/engine/utils/RandomService.ts` | Streams de gameplay vs render. | Guía para asegurar determinismo. | Documentar uso de semillas. |
| Media | Insuficiente | `src/games/asteroids/utils/ShipPhysics.ts` | Constantes físicas y escalas de fuerza. | Explicación de unidades de nave. | Comentarios sobre física nave. |
| Media | Insuficiente | `src/engine/physics/collision/BroadPhase.ts` | Complejidad del Sweep and Prune. | Poda de ejes y ordenamiento. | Comentarios inline de performance. |
| Media | Insuficiente | `src/engine/systems/LootSystem.ts` | Contrato de eventos de destrucción. | Payloads y tablas de probabilidad. | Ejemplos de uso de loot. |
| Media | Insuficiente | `src/engine/core/WorldCommandBuffer.ts` | Flushing estructural diferido. | Garantías de orden de comandos. | Explicar necesidad del diferido. |
| Media | Insuficiente | `src/engine/network/ReplicationPolicy.ts` | Tasas de envío y niveles de red. | Tabla de referencia de políticas. | TSDoc de configuración. |
| Media | Insuficiente | `src/multiplayer/InterpolationSystem.ts` | Suavizado mediante Jitter Buffer. | Factores alpha y extrapolación. | TSDoc sobre interpolación. |
| Media | Insuficiente | `src/engine/debug/StateHasher.ts` | Generación de hashes para desync. | Riesgos de floats y orden JSON. | Documentar falsos positivos. |
| Media | Insuficiente | `src/engine/debug/DebugManager.ts` | Profiling mediante EventBus. | Flujo de recolección de métricas. | Documentar singleton debug. |
| Media | Insuficiente | `src/engine/core/EventBus.ts` | Recursión y eventos diferidos. | Guardias de profundidad. | Documentar contrato de eventos. |
| Media | Insuficiente | `src/engine/core/GameLoop.ts` | Acumulador de tiempo para fixed update. | Manejo de espiral de la muerte. | Comentar lógica de acumulador. |
| Media | Insuficiente | `src/engine/rendering/RenderCommandBuffer.ts` | Pooling y sorting por z-index. | Estrategia de reciclaje de objetos. | Documentar buffer de dibujo. |
| Media | Insuficiente | `src/engine/rendering/SkiaRenderer.ts` | Factory pattern para SkPaint. | Aislamiento de estado en Skia. | Documentar drawers de Skia. |
| Media | Insuficiente | `src/engine/core/EntityPool.ts` | Reciclaje de IDs y pool circular. | Prevención de colisiones de IDs. | Documentar estrategia de pool. |
| Media | Insuficiente | `src/engine/systems/JuiceSystem.ts` | Suavizado de reconciliación visual. | Interpolación de offsets a cero. | Documentar efectos de juice. |
| Media | Insuficiente | `src/engine/systems/SpatialPartitioningSystem.ts` | Re-indexación automática del grid. | Criterios de actualización espacial. | Documentar sistema USSC. |
| Media | Insuficiente | `src/games/asteroids/systems/AsteroidCollisionSystem.ts` | Respuesta a eventos de colisión. | Contrato de eventos de impacto. | TSDoc en métodos de par. |
| Media | Insuficiente | `src/games/asteroids/EntityFactory.ts` | Composición de prefabs. | Dependencias de componentes base. | Documentar fábrica de naves. |
| Media | Insuficiente | `src/games/space-invaders/SpaceInvadersGame.ts` | Estados de oleadas y formaciones. | Lógica de movimiento de horda. | Documentar orquestador SI. |
| Media | Insuficiente | `src/games/flappybird/FlappyBirdGame.ts` | Scroll infinito y obstáculos. | Reglas de generación procedural. | Documentar orquestador FB. |
| Media | Insuficiente | `src/games/pong/PongGame.ts` | IA y física de efecto (spin). | Comportamiento de paletas. | Documentar orquestador Pong. |
| Media | Insuficiente | `src/engine/physics/utils/SpatialGrid.ts` | Hash espacial y tamaño de celda. | Algoritmo de consulta de vecinos. | Documentar recurso Grid. |
| Media | Insuficiente | `src/engine/physics/utils/PhysicsUtils.ts` | Integración y límites (wrapping). | Derivación de Euler semi-implícito. | Comentar fórmulas físicas. |
| Media | Insuficiente | `src/engine/input/UnifiedInputSystem.ts` | Abstracción de ejes y botones. | Mapeo multiplataforma. | Documentar sistema de input. |
| Media | Insuficiente | `src/engine/network/InterestManagerSystem.ts` | Filtrado de red basado en distancia. | Lógica de niveles de relevancia. | Documentar sistema de interés. |
| Baja | Insuficiente | `src/hooks/useAsteroidsGame.ts` | Bridge React-Engine específico. | Inicialización de escena y assets. | JSDoc de hook. |
| Baja | Insuficiente | `src/services/DailyChallengeService.ts` | Semillas diarias y validación. | Reglas de generación de retos. | Documentar servicio diario. |
| Baja | Insuficiente | `src/engine/core/StateMachine.ts` | Transiciones FSM. | Efectos de entrada/salida de estado. | Documentar clase FSM. |
| Baja | Insuficiente | `src/engine/ui/UIFactory.ts` | Composición de widgets. | Estilos por defecto y jerarquías. | Documentar factory de UI. |
| Baja | Insuficiente | `src/engine/assets/AssetLoader.ts` | Ciclo de vida de carga. | Gestión de memoria de texturas/sfx. | Documentar cargador de assets. |
| Baja | Insuficiente | `src/utils/MutatorRegistry.ts` | Registro de modificadores. | Hooks de aplicación de mutadores. | Documentar registro central. |
| Baja | Insuficiente | `src/engine/rendering/StarField.ts` | Parallax procedural. | Algoritmo de generación de estrellas. | Comentar efecto visual. |

## Hallazgos detallados

### [src/engine/physics/collision/NarrowPhase.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Es el componente más sensible del motor físico. Implementa el Teorema del Eje Separador (SAT) sin referencias matemáticas, lo que impide auditorías de seguridad en la detección de colisiones.

**Evidencia observada:**
Lógica densa en `polygonVsPolygon` y `circleVsPolygon` que realiza proyecciones y cálculos de MTV (Minimum Translation Vector) sin explicar la base geométrica ni la orientación de los vértices (CCW).

**Documentación recomendada:**
Explicación TSDoc de los 3 pasos del SAT: 1. Generación de ejes, 2. Proyección de vértices, 3. Detección de solapamiento.

**Ejemplo sugerido:**
```typescript
/**
 * @remarks
 * Implementa SAT (Separating Axis Theorem):
 * Para cada cara de los polígonos, proyectamos todos los vértices sobre su normal.
 * Si en algún eje no hay solapamiento, los objetos están separados.
 */
```

### [src/engine/physics/collision/ContinuousCollision.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Implementa Swept CCD para prevenir el "tunnelling". Utiliza ecuaciones cuadráticas complejas sin contexto físico.

**Evidencia observada:**
El cálculo de `t` (Time of Impact) en `sweptCircleVsCircle` carece de comentarios sobre la resolución de la ecuación cuadrática de distancia relativa.

**Documentación recomendada:**
Referenciar fórmulas de barrido lineal y explicar el concepto de TOI en el intervalo [0, 1].

**Ejemplo sugerido:**
```typescript
// Resolvemos |(Pa + Va*t) - Pb|^2 = R^2 para encontrar el instante 't' del impacto.
```

### [server/src/AsteroidsRoom.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Orquestador masivo que mezcla gestión de red, simulación autoritativa y compresión de datos.

**Evidencia observada:**
El método `update` maneja múltiples modos de replicación (`binary`, `delta`, `interest`) sin explicar el flujo de datos ni las garantías de sincronización.

**Documentación recomendada:**
README de arquitectura de red que explique el pipeline del servidor: Input -> Sim -> Sync -> Replicate.

**Ejemplo sugerido:**
```typescript
// El modo binary utiliza MessagePack para serializar deltas optimizados
// tras recibir el ACK del último Tick procesado por el cliente.
```

### [src/simulation/DeterministicSimulation.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Cerebro del juego que DEBE ser idéntico en cliente y servidor.

**Evidencia observada:**
Uso de constantes arbitrarias para movimiento de UFOs y spawn de ondas sin justificación física. Bloqueo manual de RNG no documentado.

**Documentación recomendada:**
Documentar las "Reglas de Oro del Determinismo" y el propósito de cada fase de la simulación interna.

**Ejemplo sugerido:**
```typescript
// Regla 1: No usar Math.random ni Date.now. Usar RandomService(gameplay).
```

### [src/engine/core/World.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Núcleo del ECS. Gestiona la coherencia de datos de miles de entidades.

**Evidencia observada:**
El sistema de versionado dual (`structureVersion` y `stateVersion`) requiere una explicación clara de su impacto en el culling de red y renderizado.

**Documentación recomendada:**
TSDoc sobre el coste de reconstrucción de queries y riesgos de overflow en sesiones largas.

**Ejemplo sugerido:**
```typescript
/** @remarks stateVersion se incrementa en cada mutación de componente para el netcode delta. */
```

### [src/engine/core/BaseGame.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Clase base que orquestra el ciclo de vida asíncrono del motor.

**Evidencia observada:**
Uso de `_transitionLock` y estados como `INITIALIZING` para prevenir condiciones de carrera durante reinicios.

**Documentación recomendada:**
Diagrama de estados del ciclo de vida y explicación de la fase de `flush()` del buffer de comandos.

### [src/multiplayer/useMultiplayer.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Puente entre React y el servidor Colyseus. Gestiona la sincronización temporal.

**Evidencia observada:**
Fórmula de sincronización de clocks (`localTick = serverTick + (rtt / 2 / 16.66) + buffer`) sin documentación de las bases de red.

**Documentación recomendada:**
Explicar el cálculo de RTT y el propósito del `TICK_BUFFER` para mitigar el jitter.

### [src/engine/network/NetworkDeltaSystem.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Motor de eficiencia de red. Genera parches de estado.

**Evidencia observada:**
Lógica de serialización basada en `stateTracker.hasChanged` sin documentar cómo se mantienen las baselines de ACK.

**Documentación recomendada:**
Documentar el protocolo de sincronización de deltas de componentes.

### [src/engine/physics/dynamics/PhysicsSystem2D.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Implementa resolución de impulsos y fricción.

**Evidencia observada:**
Fórmulas de resolución de impulsos (`j = -(1 + e) * v_rel / ...`) sin referencias a las leyes de Newton/Coulomb implementadas.

**Documentación recomendada:**
Comentarios inline referenciando la física de Sequential Impulses.

### [src/engine/physics/collision/CollisionSystem2D.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Orquestador de colisiones.

**Evidencia observada:**
Selección híbrida entre `SpatialGrid` y `SweepAndPrune` sin explicar los criterios de performance.

**Documentación recomendada:**
Documentar el flujo de datos: Broadphase -> CCD -> Narrowphase.

### [src/engine/core/CoreComponents.ts]

**Estado:** Crítica
**Prioridad:** Alta

**Motivo:**
Definición de tipos base del motor.

**Evidencia observada:**
Propiedades como `Velocity.dx` o `Health.invulnerableRemaining` no especifican si están en pixels/s, pixels/tick o ms.

**Documentación recomendada:**
Añadir etiquetas de unidades `[px/s]`, `[ms]`, `[rad]` a todas las propiedades físicas.

### [src/games/asteroids/AsteroidsGame.ts]

**Estado:** Crítica
**Prioridad:** Media

**Motivo:**
Lógica de cliente para Asteroids con reconciliación.

**Evidencia observada:**
Manejo de `VisualOffset` para suavizar correcciones del servidor sin explicar la técnica de interpolación.

**Documentación recomendada:**
TSDoc sobre la integración de corrección de errores suave.

### [src/engine/rendering/CanvasRenderer.ts]

**Estado:** Crítica
**Prioridad:** Media

**Motivo:**
Pipeline de renderizado por snapshots.

**Evidencia observada:**
 pooling de `DrawCommand` y pre-alocación de snapshots para evitar GC no documentados.

**Documentación recomendada:**
Explicar el desacoplamiento de la captura y el dibujado.

### [src/engine/ui/UILayoutSystem.ts]

**Estado:** Crítica
**Prioridad:** Media

**Motivo:**
Motor de layout jerárquico.

**Evidencia observada:**
Resolución recursiva de anclajes y anidamiento de contenedores con riesgos de performance.

**Documentación recomendada:**
Documentar el orden de resolución de layout y el manejo de z-index.

### [src/engine/core/Query.ts]

**Estado:** Crítica
**Prioridad:** Media

**Motivo:**
Eficiencia en el acceso a entidades.

**Evidencia observada:**
Caché reactivo basado en firmas de componentes (`...types.sort().join(",")`).

**Documentación recomendada:**
Advertencia sobre el coste de creación de queries dinámicas en tiempo de ejecución.

---

## Priorización recomendada

### Mejorar primero (Core Simulación y Red)
Impacto crítico en determinismo y estabilidad: `NarrowPhase`, `ContinuousCollision`, `DeterministicSimulation`, `AsteroidsRoom`, `NetworkDeltaSystem`.

### Mejorar después (Orquestación del Motor)
Impacto en mantenibilidad general: `World`, `BaseGame`, `useMultiplayer`, `PhysicsSystem2D`.

### Mejorar cuando se modifiquen
Sistemas secundarios, utilidades y servicios de dominio.

## Recomendaciones generales

1.  **Estándar de Unidades:** Obligatorio en `CoreComponents.ts`.
2.  **README por Dominio:** Guías en `src/engine/*` (Network, Physics, Rendering).
3.  **Documentación de Decisiones (ADR):** Registrar en `/docs/adr` el porqué de arquitecturas complejas.
4.  **Uso de TSDoc:** Estandarizar `@responsibility`, `@remarks` y `@conceptualRisk`.

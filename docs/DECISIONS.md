# Decisiones técnicas — react-native-asteroids

## DECISION-001: Cached World.entities Sorting
- **Fecha:** Histórico
- **Contexto:** En cada tick, los sistemas activos del juego y/o los motores de renderizado iteran sobre todas las entidades activas en el ECS World. La implementación original de `World.entities` realizaba `Array.from(this.activeEntities).sort((a, b) => a - b)` en cada llamada, provocando un overhead de CPU de $O(N \log N)$ y una alta presión del recolector de basura (GC) por asignaciones constantes.
- **Decisión:** Se introdujo una caché interna `cachedEntities: ReadonlyArray<Entity> | null` que almacena la lista ordenada de entidades. La propiedad `entities` lee de esta caché y solo la invalida (`null`) ante cambios estructurales como `createEntity()`, `removeEntity()` o `clear()`.
- **Alternativas consideradas:** Mantener un array ordenado continuamente insertando en $O(N)$, pero se descartó porque la adición masiva de entidades es más lenta que ordenar una sola vez al final del frame bajo demanda.
- **Consecuencias / Trade-offs:** Acceso a `entities` en $O(1)$ la mayor parte del tiempo, reduciendo significativamente la vibración o stutters de frames.
- **Archivos impactados:** `packages/core/src/ecs/World.ts`

## DECISION-002: Exposing World Entity Activation API
- **Fecha:** Histórico
- **Contexto:** `WorldCommandBuffer` requería activar identificadores de entidades reservadas accediendo a campos privados de `World` usando conversiones de tipos no seguras en TypeScript (`world as any`). Esto rompía el principio de encapsulación y era vulnerable a refactorizaciones.
- **Decisión:** Se expuso un método público y formal `activateEntity(entity: Entity)` en la clase `World` para agregar la entidad de manera controlada, invalidar la caché de entidades e incrementar la versión estructural del mundo (`_structureVersion`).
- **Alternativas consideradas:** Permitir acceso directo a sets internos de datos, descartado para conservar la integridad relacional del ECS.
- **Consecuencias / Trade-offs:** Se restauró la encapsulación del objeto `World` y se eliminaron casts inseguros en el monorepo.
- **Archivos impactados:** `packages/core/src/ecs/World.ts`, `packages/core/src/ecs/WorldCommandBuffer.ts`

## DECISION-003: Decoupled ECS Input Bridge
- **Fecha:** Histórico
- **Contexto:** El componente visual de Asteroids interactuaba de forma directa con la simulación interna buscando la entidad `"LocalPlayer"` y mutando directamente su componente de entrada `"InputState"` con callbacks acoplados, violando los límites de arquitectura hexagonal.
- **Decisión:** Se diseñó un "Input Bridge" implementando la firma `setInputState(input: Partial<InputState>)` en la interfaz `IAsteroidsGame` (y sus implementaciones real/nula), aislando las búsquedas internas del ECS del renderizador o vistas React.
- **Alternativas consideradas:** Seguir mutando de forma directa desde los archivos JSX, descartado por dificultar la mantenibilidad y refactorización del core.
- **Consecuencias / Trade-offs:** Desacoplamiento total de la UI de React de las estructuras de datos y consultas internas del ECS, mejorando el tipado de componentes.
- **Archivos impactados:** `packages/core/src/games/asteroids/AsteroidsGame.ts`, `src/app/asteroids/index.tsx`

## DEC-004: Dashboard de Telemetría Interactivo en DebugOverlay con Polling Seguro
- **Fecha:** 2025-02-21
- **Contexto:** Los desarrolladores necesitaban una herramienta interactiva para monitorear el comportamiento de red (latencia RTT, ratio de compresión SoA, pausas GC y estado del Heap) en tiempo real durante sesiones multijugador, sin perjudicar el rendimiento de simulación del juego en el cliente.
- **Decisión:** Se integró una pestaña "Metrics" dentro del componente `DebugOverlay` de React Native. Cuando la pestaña está activa, se registra dinámicamente un handler de red para el evento `"metrics"` mediante Colyseus, realizando una petición de telemetría segura (`room.send("metrics")`) con un intervalo de actualización de exactamente 2000 ms.
- **Alternativas consideradas:** Polling rápido (e.g. 100 ms) o transmisión continua push del servidor, descartado por saturación potencial de ancho de banda y degradación de la latencia en hilos principales de juego.
- **Consecuencias / Trade-offs:** Excelente visibilidad de telemetría sin impacto de red en el bucle principal de frames. El cálculo de latencia RTT se actualiza de manera fluida y adaptativa basándose en el tiempo de ida y vuelta de cada consulta.
- **Archivos impactados:** `src/components/debug/DebugOverlay.tsx` (Líneas 95-128)

## DEC-005: Colector Avanzado de Métricas de Red y GC con Fallback Resiliente
- **Fecha:** 2025-02-21
- **Contexto:** El servidor headless y las salas de juego necesitaban cuantificar de forma rigurosa la eficiencia del pipeline binario y la frecuencia de pausas del Garbage Collector (GC), pero las APIs nativas de monitorización (`PerformanceObserver` con `entryTypes: ['gc']`) pueden no estar habilitadas o soportadas en ciertos entornos de ejecución o contenedores de hosting.
- **Decisión:** Se diseñó `NetworkMetricsCollector` utilizando `PerformanceObserver` nativo de Node para registrar estadísticas reales de pausas. Al mismo tiempo, se incorporó una lógica resiliente de fallback en el método `recordTick` que compara el diferencial del uso de memoria heap (`process.memoryUsage().heapUsed`). Si el delta de memoria es negativo y no hay un observer GC nativo activo, se contabiliza la caída de memoria como una pausa GC de forma automatizada.
- **Alternativas consideradas:** Omitir reportes de GC en plataformas que carezcan de APIs nativas de Node, descartado para evitar pérdida de fiabilidad de telemetría.
- **Consecuencias / Trade-offs:** El colector recopila datos precisos de asignaciones históricas, bytes liberados y pausas del GC de manera transparente. Cuenta con un método de desregistro `destroy()` invocado de forma segura en `onDispose` de la sala Colyseus para evitar fugas de memoria por observadores activos.
- **Archivos impactados:** `server/src/metrics/NetworkMetrics.ts`, `server/src/AsteroidsRoom.ts`

## DEC-006: Compresión Binaria de Red para Snapshots SoA usando msgpackr
- **Fecha:** 2025-02-21
- **Contexto:** Transmitir continuamente el estado del juego como un Snapshot de tipo AoS (Array of Structures) serializado a JSON string plano generaba un alto consumo de ancho de banda y un incremento insostenible en la frecuencia de recolección de basura debido a miles de asignaciones de propiedades dinámicas y strings por frame.
- **Decisión:** Se adoptó la estructura Structure of Arrays (SoA) basada en arrays planos continuos en memoria (`TypedArrays` como `Int32Array` y `Float64Array`). Para su transmisión por red, se implementó empaquetamiento binario nativo en la clase `BinaryCompression` instanciando `Packr` de la librería `msgpackr` con las opciones de inicialización `{ useRecords: false, structuredClone: true }`.
- **Alternativas consideradas:** Usar serialización JSON tradicional sobre snapshots SoA, descartado porque los TypedArrays se habrían serializado como costosos objetos indexados planos `{ "0": x, "1": y }` en lugar de buffers binarios puros.
- **Consecuencias / Trade-offs:** Reducción drástica del tamaño de transmisión (promedio de 2.5x a 3x de compresión) y eliminación absoluta de las asignaciones de objetos dinámicos. Para registrar métricas comparativas precisas sin degradar el rendimiento, el servidor computa de forma asíncrona un snapshot AoS JSON de contraste solo una vez cada 120 ticks (~2 segundos).
- **Archivos impactados:** `packages/core/src/network/MultiplayerSystems.ts`, `packages/core/src/snapshots/WorldSnapshot.ts`, `server/src/AsteroidsRoom.ts`

## DEC-007: Priorización del Roadmap de Diseño Creativo (Game Feel)
- **Fecha:** 2026-07-20
- **Contexto:** Tras consolidar con éxito la estabilidad y el rendimiento de la arquitectura del motor y las comunicaciones de red, es prioritario definir un plan de diseño de mecánicas y pulido ("juiciness") centrado en el jugador que eleve la diversión y retención de cada minijuego.
- **Decisión:** Se elaboró un Roadmap Creativo formal (`docs/ROADMAP_CREATIVE.md`) detallando mejoras incrementales, intermedias y disruptivas para cada uno de los cuatro juegos activos (Asteroids, Space Invaders, Flappy Bird y Pong), alineadas con los conceptos de C.C.C. (Character, Camera, Controls) y tutorialización invisible de Scott Rogers.
- **Alternativas consideradas:** Realizar refactorizaciones espontáneas de jugabilidad directamente en el código, descartado para no comprometer el estado impecable actual de los tests de simulación física y determinismo.
- **Consecuencias / Trade-offs:** Excelente visibilidad y catalogación de tareas de diseño por costo, impacto y complejidad, listas para ser desarrolladas de manera iterativa y segura.
- **Archivos impactados:** `docs/ROADMAP_CREATIVE.md`

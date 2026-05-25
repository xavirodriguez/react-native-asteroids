# TODO Index

Documento generado a partir de un análisis del repositorio.

## Resumen ejecutivo

- **Número total de tareas encontradas**: 15
- **Número de tareas explícitas**: 10
- **Número de tareas inferidas**: 5
- **Número de posibles tareas obsoletas**: 0
- **Distribución por prioridad**:
  - P0: 1
  - P1: 3
  - P2: 6
  - P3: 5
- **Distribución por área del proyecto**:
  - Core Engine: 4
  - Physics: 3
  - Gameplay/Systems: 5
  - Multiplayer: 1
  - UI/Utils: 2

## Criterios de clasificación

- **P0 — Crítica**: Seguridad, pérdida de datos, fallo grave en producción, bloqueo funcional importante.
- **P1 — Alta**: Bug importante, deuda técnica con impacto claro, comportamiento incompleto relevante, o divergencia arquitectónica que bloquea la escalabilidad.
- **P2 — Media**: Mejora necesaria, refactorización razonable, limpieza técnica con impacto moderado.
- **P3 — Baja**: Limpieza menor, documentación, pequeños ajustes, tareas cosméticas.

## Tareas encontradas

### TODO-015 — Resolver archivos faltantes y tests rotos
- Prioridad: P0
- Tipo: Bug / Mantenimiento
- Estado detectado: Inferida
- Archivo: `src/simulation/DeterministicSimulation.ts` y `src/games/asteroids/headless/AsteroidsHeadlessSimulation.ts`
- Línea aproximada: `1`
- Evidencia:
  > Múltiples tests fallan por "Cannot find module" refiriéndose a estos archivos.
- Descripción:
  Faltan archivos críticos de simulación en el repositorio que están siendo importados por tests y utilidades de física.
- Impacto potencial:
  Imposibilidad de ejecutar el pipeline de CI/CD, tests unitarios rotos y regresiones no detectadas en la simulación física y el multijugador.
- Sugerencia de acción:
  Restaurar los archivos faltantes o actualizar los tests y referencias para usar la nueva arquitectura ECS pura si los archivos fueron eliminados intencionadamente.

### TODO-001 — Unificar tipos duplicados en Engine
- Prioridad: P1
- Tipo: Refactor / Deuda Técnica
- Estado detectado: Inferida
- Archivo: `src/engine/types/core.ts` y `src/engine/types/EngineTypes.ts`
- Línea aproximada: `1`
- Evidencia:
  > Ambos archivos definen `WorldSnapshot`, `SerializedComponent` y `ComponentDataSnapshot` con ligeras variaciones.
- Descripción:
  Existen dos definiciones para el estado del mundo (`WorldSnapshot`). `EngineTypes.ts` parece ser una versión extendida que incluye `rngState` y `accumulator`.
- Impacto potencial:
  Inconsistencias al serializar/deserializar el estado del juego, confusión en el desarrollo y bugs difíciles de trazar en el rollback de red.
- Sugerencia de acción:
  Centralizar en un único archivo de tipos core o establecer una jerarquía de herencia clara. Eliminar duplicados.

### TODO-002 — Migrar de PhysicsSystem2D a sistemas específicos
- Prioridad: P1
- Tipo: Refactor / Performance
- Estado detectado: Explícita
- Archivo: `src/engine/physics/dynamics/PhysicsSystem2D.ts`
- Línea aproximada: `12`
- Evidencia:
  > * @deprecated Use PhysicsIntegrateSystem and PhysicsSolveSystem instead for correct execution order.
- Descripción:
  El sistema monolítico de física está marcado como obsoleto. La arquitectura actual requiere separar la integración de la resolución de colisiones para garantizar el determinismo.
- Impacto potencial:
  Errores de orden de ejecución (race conditions) en la simulación física, afectando especialmente al modo multijugador.
- Sugerencia de acción:
  Eliminar `PhysicsSystem2D` y asegurar que todos los juegos usen el par `PhysicsIntegrateSystem` / `PhysicsSolveSystem` en las fases correctas.

### TODO-003 — Eliminar StatusEffectSystem en favor de ModifierSystem
- Prioridad: P1
- Tipo: Refactor
- Estado detectado: Explícita
- Archivo: `src/engine/systems/StatusEffectSystem.ts`
- Línea aproximada: `5`
- Evidencia:
  > * @deprecated Use ModifierSystem instead.
- Descripción:
  Coexisten dos sistemas para gestionar efectos temporales. `StatusEffectSystem` es la versión antigua.
- Impacto potencial:
  Lógica duplicada y mantenimiento innecesario. Posibles conflictos si ambos sistemas intentan modificar los mismos atributos.
- Sugerencia de acción:
  Migrar cualquier lógica restante a `ModifierSystem` y borrar el archivo.

### TODO-004 — Reemplazar CommandBuffer legacy
- Prioridad: P2
- Tipo: Refactor
- Estado detectado: Explícita
- Archivo: `src/engine/legacy/CommandBuffer.ts`
- Línea aproximada: `4`
- Evidencia:
  > * @deprecated Use {@link RenderCommandBuffer} instead.
- Descripción:
  Existe un adaptador de compatibilidad para el buffer de comandos de renderizado.
- Impacto potencial:
  Uso de APIs obsoletas que podrían no soportar nuevas optimizaciones de renderizado.
- Sugerencia de acción:
  Actualizar todas las referencias de `CommandBuffer` a `RenderCommandBuffer` y eliminar la carpeta `legacy` si es posible.

### TODO-005 — Implementar métodos de ciclo de vida en AsteroidsGame
- Prioridad: P2
- Tipo: Funcionalidad incompleta
- Estado detectado: Inferida
- Archivo: `src/games/asteroids/AsteroidsGame.ts`
- Línea aproximada: `380`
- Evidencia:
  > public start() {} public stop() {} public pause() {} public resume() {}
- Descripción:
  Los métodos principales de control del juego están vacíos.
- Impacto potencial:
  Imposibilidad de pausar correctamente el juego o limpiar recursos al cerrar la escena, lo que puede causar memory leaks.
- Sugerencia de acción:
  Implementar la lógica de pausa/reanudación y limpieza de eventos en estos métodos.

### TODO-006 — Corregir dimensiones de pantalla hardcodeadas
- Prioridad: P2
- Tipo: Configuración / Bug
- Estado detectado: Explícita
- Archivo: `src/engine/systems/SpatialPartitioningSystem.ts`
- Línea aproximada: `53`
- Evidencia:
  > // Attempt to get viewport dimensions from a resource, or fallback to standard 800x600
- Descripción:
  Si no se encuentra `ScreenConfig`, el sistema asume 800x600, lo cual puede romper el culling en dispositivos móviles modernos.
- Impacto potencial:
  Objetos que desaparecen prematuramente o que nunca se renderizan en pantallas grandes.
- Sugerencia de acción:
  Asegurar que `ScreenConfig` sea un recurso obligatorio o usar las dimensiones reales del dispositivo vía `Renderer`.

### TODO-007 — Reducir el uso de 'as any' en ComponentCloner
- Prioridad: P2
- Tipo: Deuda Técnica
- Estado detectado: Inferida
- Archivo: `src/engine/core/ComponentCloner.ts`
- Línea aproximada: `72-81`
- Evidencia:
  > (data as any).length, (copy as any)[i], etc.
- Descripción:
  El sistema de clonación de componentes depende excesivamente de casteos a `any`, perdiendo seguridad de tipos en una pieza crítica del motor.
- Impacto potencial:
  Errores en tiempo de ejecución al clonar componentes con estructuras complejas que el compilador no detecta.
- Sugerencia de acción:
  Implementar tipos genéricos más estrictos o usar validación de esquemas para la clonación profunda.

### TODO-008 — Migrar RandomService a uso de instancias (World Resources)
- Prioridad: P2
- Tipo: Refactor / Determinismo
- Estado detectado: Explícita
- Archivo: `src/engine/utils/RandomService.ts`
- Línea aproximada: `65-114`
- Evidencia:
  > /** @deprecated Access RNG via World resources instead. */
- Descripción:
  Los métodos estáticos de `RandomService` están marcados como obsoletos para favorecer el uso de una instancia inyectada en el `World`.
- Impacto potencial:
  Pérdida de determinismo en simulaciones multijugador si se usa el estado global del RNG en lugar del estado sincronizado del mundo.
- Sugerencia de acción:
  Refactorizar los call-sites en los sistemas para que obtengan el RNG desde `world.getResource`.

### TODO-009 — Migrar ColyseusClient a ColyseusConnection
- Prioridad: P2
- Tipo: Refactor
- Estado detectado: Explícita
- Archivo: `src/multiplayer/ColyseusClient.ts`
- Línea aproximada: `62`
- Evidencia:
  > /** @deprecated Use ColyseusConnection class */
- Descripción:
  Clase de cliente multijugador marcada como obsoleta.
- Impacto potencial:
  Dificultad para implementar nuevas funcionalidades de red si se sigue usando el cliente antiguo.
- Sugerencia de acción:
  Sustituir el uso de `ColyseusClient` por la nueva abstracción `ColyseusConnection`.

### TODO-010 — Placeholder de formato de semilla (Seed)
- Prioridad: P3
- Tipo: Documentación / UI
- Estado detectado: Explícita
- Archivo: `src/utils/SeedUtils.ts` y `components/SeedWidget.tsx`
- Línea aproximada: `7`, `38`
- Evidencia:
  > placeholder="XXXX-XXXX"
- Descripción:
  El formato de semilla legible "XXXX-XXXX" es un estándar visual pero el código podría beneficiarse de validación más robusta.
- Impacto potencial:
  Entradas de usuario inválidas que resulten en semillas inconsistentes.
- Sugerencia de acción:
  Implementar una máscara de entrada real en el `SeedWidget` y validación por Regex en `SeedUtils`.

### TODO-011 — Implementar métodos de ciclo de vida en SpaceInvadersGame
- Prioridad: P2
- Tipo: Funcionalidad incompleta
- Estado detectado: Inferida
- Archivo: `src/games/space-invaders/SpaceInvadersGame.ts`
- Línea aproximada: `274`
- Evidencia:
  > public start() {} public stop() {} public pause() {} public resume() {}
- Descripción:
  Similar a TODO-005, el esqueleto del juego no tiene lógica de control.
- Impacto potencial:
  Inconsistencias en el estado del juego al navegar por la App.
- Sugerencia de acción:
  Sincronizar con el estado global de la aplicación.

### TODO-012 — Refactorizar AsteroidInputSystem para usar Singleton
- Prioridad: P3
- Tipo: Refactor
- Estado detectado: Explícita
- Archivo: `src/games/asteroids/systems/AsteroidInputSystem.ts`
- Línea aproximada: `37`
- Evidencia:
  > @deprecated Use world.getSingleton<InputStateComponent>("InputState") instead.
- Descripción:
  El sistema sigue usando un método de obtención de input obsoleto.
- Impacto potencial:
  Uso ineficiente de consultas al mundo.
- Sugerencia de acción:
  Actualizar el acceso al componente de entrada.

### TODO-013 — Consolidar CollisionManifold
- Prioridad: P3
- Tipo: Refactor
- Estado detectado: Explícita
- Archivo: `src/engine/physics/collision/CollisionTypes.ts`
- Línea aproximada: `38-42`
- Evidencia:
  > @deprecated Use context-provided entities in systems or event components.
- Descripción:
  Campos específicos en el manifold de colisión están marcados para eliminación.
- Impacto potencial:
  Acoplamiento innecesario con IDs de entidades dentro del manifold.
- Sugerencia de acción:
  Limpiar la interfaz `CollisionManifold` eliminando los campos marcados.

### TODO-014 — EventBus flushDeferred deprecation
- Prioridad: P3
- Tipo: Refactor
- Estado detectado: Explícita
- Archivo: `src/engine/core/EventBus.ts`
- Línea aproximada: `107`
- Evidencia:
  > /** @deprecated Use {@link EventBus.flushDeferred} instead. */
- Descripción:
  Parece haber una confusión en la documentación o una autorreferencia marcada como deprecated.
- Impacto potencial:
  Confusión para el desarrollador sobre qué método usar.
- Sugerencia de acción:
  Revisar si el método debería llamarse de otra forma o si la anotación es errónea.

## Agrupación por área

### Core Engine
- TODO-001 — Unificar tipos duplicados en Engine
- TODO-007 — Reducir el uso de 'as any' en ComponentCloner
- TODO-008 — Migrar RandomService a uso de instancias
- TODO-014 — EventBus flushDeferred deprecation

### Physics
- TODO-002 — Migrar de PhysicsSystem2D a sistemas específicos
- TODO-006 — Corregir dimensiones de pantalla hardcodeadas
- TODO-013 — Consolidar CollisionManifold

### Gameplay / Systems
- TODO-015 — Resolver archivos faltantes y tests rotos
- TODO-003 — Eliminar StatusEffectSystem en favor de ModifierSystem
- TODO-005 — Implementar métodos de ciclo de vida en AsteroidsGame
- TODO-011 — Implementar métodos de ciclo de vida en SpaceInvadersGame
- TODO-012 — Refactorizar AsteroidInputSystem para usar Singleton

### Multiplayer
- TODO-009 — Migrar ColyseusClient a ColyseusConnection

### UI / Utils
- TODO-004 — Reemplazar CommandBuffer legacy
- TODO-010 — Placeholder de formato de semilla (Seed)

## Tareas posiblemente obsoletas

No se han detectado tareas claramente obsoletas fuera de las marcadas explícitamente como `@deprecated`.

## Recomendaciones finales

### Las 5 tareas más urgentes
1. **TODO-015 (Archivos faltantes)**: Crítico para la integridad del proyecto y tests.
2. **TODO-001 (Tipos duplicados)**: Es la base de la estabilidad del estado.
3. **TODO-002 (Refactor PhysicsSystem2D)**: Vital para el determinismo y orden de ejecución.
4. **TODO-008 (RandomService Instance)**: Crucial para evitar desincronizaciones en red.
5. **TODO-003 (StatusEffectSystem)**: Simplifica la lógica de gameplay.

### Quick wins
- **TODO-012 (AsteroidInputSystem Singleton)**: Cambio trivial de una línea.
- **TODO-013 (CollisionManifold cleanup)**: Eliminación de campos obsoletos.
- **TODO-004 (CommandBuffer legacy)**: Sustitución de tipo.

### Áreas con mayor concentración de deuda técnica
El **Core Engine** y el sistema de **Physics** concentran la mayor parte de la deuda arquitectónica, especialmente en lo referente a la duplicidad de tipos de snapshots y el uso de sistemas monolíticos obsoletos.

### Recomendaciones para evitar dispersión
1. **Linting de TODOs**: Implementar una regla de ESLint que obligue a asignar una prioridad o una issue ID a cada TODO.
2. **Gating de Deprecación**: No permitir que nuevas piezas de código importen símbolos marcados como `@deprecated` (usar `eslint-plugin-import`).
3. **Centralización de Tipos**: Mover todos los tipos de contrato (snapshots, componentes core) a un único subpath `@engine/types`.

# Engine Evolution Ledger

Este documento registra de forma cronológica y estratégica la evolución del TinyAsterEngine, capturando decisiones de arquitectura, cambios en la API pública, deuda técnica eliminada y compromisos futuros.

---

## [2024-05-23] Consolidación de API y Saneamiento de Componentes Core

### Estado detectado
- **Fragmentación de Autoridad**: Coexistencia de `PositionComponent` (Legacy) y `TransformComponent` (Moderno).
- **Surface Pública Contaminada**: Componentes core (`InputStateComponent`, `TilemapComponent`) contenían métodos de lógica, violando el principio de "Componentes como datos puros".
- **Exports Rotos**: `CoreComponents.ts` intentaba exportar tipos inexistentes de `LegacyComponents.ts`.

### Decisiones tomadas
1. **Endurecimiento de Legacy**: Se definieron formalmente `PositionComponent` y `ColliderComponent` en el namespace `Legacy` para evitar errores de compilación y señalizar su obsolescencia.
2. **Pureza de Datos**: Eliminación de las propiedades `isPressed`, `getAxis` (Input) e `isSolid` (Tilemap) de los componentes. La lógica ahora reside exclusivamente en `InputUtils` y `TilemapUtils`.
3. **Contrato de Transform**: Se ratifica a `TransformComponent` como la única fuente de verdad para posición y jerarquía.

### Archivos afectados
- `src/engine/legacy/LegacyComponents.ts`
- `src/engine/core/CoreComponents.ts`

### Deuda abierta / Siguientes pasos
- Migrar cualquier uso residual de `PositionComponent` a `TransformComponent` (si se detectan en gameplay).
- Auditar `JuiceSystem` para asegurar que no dependa de interfaces legacy de `ScreenShake`.
- Implementar validaciones en `World.addComponent` para emitir advertencias al usar componentes del namespace `Legacy`.

---

## [2024-05-24] Saneamiento de Ciclo de Vida y Hardening de Tipos

### Estado detectado
- **Contratos de Reinicio Rotos**: El método `restart` no soportaba semillas, lo que impedía reinicios deterministas exigidos por la UI.
- **Riesgos de Plataforma**: `useKeepAwake` lanzaba errores en la web en contextos no seguros debido a la ausencia de `navigator.wakeLock`.
- **Proliferación de `any`**: Se detectaron más de 50 advertencias de lint por uso de `any` en archivos críticos del motor y de Asteroids, degradando la seguridad de tipos.

### Decisiones tomadas
1. **API de Reinicio Determinista**: Se actualizó `IGame` y `BaseGame` para aceptar una semilla opcional en `restart()`.
2. **Hardening de useKeepAwake**: Se añadieron verificaciones de entorno para silenciar errores de `wakeLock` en navegadores no compatibles.
3. **Erradicación Sistémica de `any`**: Se reemplazaron usos de `any` por `unknown`, `Record<string, unknown>` o tipos específicos en AssetLoader, Renderer, Physics, y EntityFactory. Se refinó el acceso a datos en `JuiceSystem` y `RenderUpdateSystem`.
4. **Sincronización de Hooks**: Se actualizaron los hooks de dominio (`useAsteroidsGame`, etc.) para alinearlos con la nueva firma de `restart`.

### Archivos afectados
- `src/engine/core/IGame.ts`
- `src/engine/core/BaseGame.ts`
- `src/hooks/useGame.ts`
- `src/hooks/useKeepAwake.ts`
- +30 archivos de motor y gameplay (ver commit).

### Impacto
- **Robustez**: Se eliminaron errores de runtime en el ciclo de vida y en la web.
- **Mantenibilidad**: El motor ahora es más estricto, facilitando refactors futuros sin romper contratos invisibles.
- **Determinismo**: Los reinicios ahora garantizan el mismo estado inicial si se provee una semilla.

### Deuda abierta / Siguientes pasos
- Implementar un sistema de telemetría básico para detectar fallos de determinismo en producción.

---

## [2024-05-24] Deprecación de InputManager y Consolidación de Boundary

### Estado detectado
- **Fragmentación de Input**: `AsteroidsGameScene` dependía de `InputManager` (Legacy) y configuraba controladores manualmente, duplicando la lógica de `BaseGame`.
- **Inconsistencia en Boundary**: Uso mixto de `mode` y `behavior` en `BoundaryComponent`.
- **Bug en PhysicsUtils**: Error de referencia `p` en `integrateMovement` impedía el correcto funcionamiento de la física.
- **Surface Pública**: `CoreComponents.ts` exponía componentes legacy directamente, oscureciendo la API canónica.

### Decisiones tomadas
1. **Unificación de Input**: Se eliminó `InputManager` de Asteroids. Ahora todas las escenas deben usar `UnifiedInputSystem` a través del singleton `InputStateComponent`.
2. **Estandarización de Propiedades**: Se migró el uso de `mode` a `behavior` en Pong para alinearse con el contrato moderno de `BoundaryComponent`.
3. **Saneamiento de API Core**: Se eliminaron los re-exports de `PositionComponent` y `ColliderComponent` en `CoreComponents.ts`. Estos componentes ahora solo son accesibles a través del namespace `Legacy`.
4. **Fix de Integración Física**: Se corrigieron las variables en `PhysicsUtils.integrateMovement` y `applyFriction` para asegurar compatibilidad con proxies de predicción.

### Archivos afectados
- `src/games/asteroids/scenes/AsteroidsGameScene.ts`
- `src/games/asteroids/systems/AsteroidInputSystem.ts`
- `src/games/pong/EntityFactory.ts`
- `src/engine/core/CoreComponents.ts`
- `src/engine/utils/PhysicsUtils.ts`

### Impacto
- **Claridad**: El flujo de entrada es ahora uniforme en todo el motor.
- **Robustez**: Se corrigió un bug crítico en el núcleo de física que afectaba a todos los sistemas.
- **Seguridad de API**: Se redujo la posibilidad de usar componentes obsoletos por accidente.

### Deuda abierta / Siguientes pasos
- Auditar `SpaceInvadersGame` para asegurar que no queden dependencias de `InputManager`.
- Migrar el ejemplo `PongGame` en `ExampleRegistration.ts` para usar `Collider2DComponent`.

## [Plantilla para Futuras Entradas]

### [FECHA] Título de la Evolución

#### Estado detectado
- Resumen del problema identificado.

#### Decisiones tomadas
- Qué se cambió y por qué.

#### Archivos afectados
- Lista de archivos modificados.

#### Impacto
- Cómo mejora la reusabilidad, coherencia o seguridad.

#### Deuda abierta / Siguientes pasos
- Qué quedó pendiente.

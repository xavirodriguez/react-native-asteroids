# 🚀 Épicas Arquitectónicas (EPICS.md)

Este documento agrupa la hoja de ruta y las tareas pendientes en **Iniciativas Arquitectónicas (Epics)** integrales, facilitando una evolución estructurada y priorizada del motor de juego.

---

## 📅 Resumen de Épicas

```
┌────────────────────────────────────────────────────────┐
│ Epic 1: Estabilizar el Ciclo de Vida                   │ ➔ Prioridad 1 (En Progreso - 60% Completo)
├────────────────────────────────────────────────────────┤
│ Epic 2: Desacoplamiento Core / Plataforma y Headless  │ ➔ Prioridad 2 (Completada/Estable - 100% Completo)
├────────────────────────────────────────────────────────┤
│ Epic 3: API de Mutaciones Seguras e Invariantes ECS    │ ➔ Prioridad 3 (En Progreso - 20% Completo)
├────────────────────────────────────────────────────────┤
│ Epic 4: Reducción de Duplicación y Gameplay Común     │ ➔ Prioridad 4 (En Progreso - 0% Completo)
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Detalle de Épicas

### 🎬 **Epic 1: Estabilizar el Ciclo de Vida**
* **Objetivo**: Garantizar transiciones de estado deterministas, idempotentes y libres de memory leaks al inicializar, pausar, destruir o reiniciar juegos.
* **Tareas**:
  - [x] Unificar la gestión de ciclo de vida en `BaseGame` (autoridad única).
    <!-- Verificado 2025-02-22: packages/core/src/runtime/BaseGame.ts:47-210, la inicialización, loops de render/update, pausa y destrucción se centralizan en la clase base abstracta BaseGame. -->
  - [x] Corregir la fuga de memoria y acumulación de listeners en el `EventBus` al reiniciar la simulación (limpieza explícita de sistemas y bus en `BaseGame.destroy()`).
    <!-- Verificado 2025-02-22: packages/core/src/runtime/BaseGame.ts:153-162, BaseGame.destroy() detiene el loop, limpia el schedule de sistemas y llama explícitamente a this.eventBus.clear(). -->
  - [~] Restaurar e integrar `AsteroidComboSystem` con un patrón limpio de desuscripción mediante `dispose()`.
    <!-- Verificado 2025-02-22: PARCIAL. No existe un archivo físico con el nombre 'AsteroidComboSystem', pero la acumulación se solucionó de raíz en BaseGame.ts:182 al limpiar el eventBus. Además, se implementó ComboSystem con un método dispose() limpio en packages/core/src/games/arcade/systems/ComboSystem.ts, el cual es registrado en SpaceInvadersGameScene.ts. -->
  - [ ] Implementar una máquina de estados explícita de ciclo de vida en `BaseGame` (`Uninitialized`, `Ready`, `Running`, `Paused`, `Stopped`, `Destroyed`).
    <!-- Verificado 2025-02-22: NO INICIADO. En packages/core/src/runtime/BaseGame.ts:17-21 solo se definen los estados RUNNING, PAUSED y DESTROYED en el enum GameLifecycleState, y no existe una máquina de estados explícita ni validación estricta de transiciones. -->
  - [~] Validar con tests unitarios la idempotencia de `pause()` / `resume()` y la ejecución serializada de `restart()`.
    <!-- Verificado 2025-02-22: PARCIAL. La idempotencia de pause() y resume() está completamente testeada en packages/core/src/__tests__/BaseGame.lifecycle.test.ts:60-101. Sin embargo, no hay implementación ni validación de la ejecución serializada de restart(). -->

---

### 🛡️ **Epic 3: API de Mutaciones Seguras e Invariantes del ECS**
* **Objetivo**: Endurecer el ECS previniendo mutaciones accidentales del estado interno o corrupción estructural del mundo.
* **Tareas**:
  - [ ] Modificar `Query.getEntities()` para que devuelva un objeto de lectura o una copia inmutable, evitando exponer el array interno cacheado.
    <!-- Verificado 2025-02-22: NO INICIADO. En packages/core/src/ecs/Query.ts:63-69, Query.getEntities() devuelve directamente la referencia al array cacheado sortedEntities, que es mutable en runtime. -->
  - [ ] Separar de manera estricta las operaciones de lectura (`readComponent`) de las de modificación de datos (`mutateComponent`).
    <!-- Verificado 2025-02-22: NO INICIADO. No se ha implementado ningún método readComponent en packages/core/src/ecs/World.ts, solo getComponent y mutateComponent. -->
  - [ ] Asegurar que las mutaciones estructurales (crear/destruir entidades, añadir/eliminar componentes) durante la fase de actualización pasen únicamente por `world.commands` (CommandBuffer estructural).
    <!-- Verificado 2025-02-22: NO INICIADO. En packages/core/src/ecs/World.ts:203-210, addComponent, createEntity, etc., no lanzan excepciones ni restringen mutaciones directas cuando isUpdating === true, solo lo advierten en TSDoc. -->
  - [~] Reemplazar la propiedad sobrecargada `World.version` por contadores semánticos independientes: `stateVersion`, `structureVersion`, `renderDirty` y `tick`.
    <!-- Verificado 2025-02-22: PARCIAL. En packages/core/src/ecs/World.ts:109-113 se agregaron getters independientes para tick, structureVersion y stateVersion, eliminando World.version. Sin embargo, la propiedad renderDirty no existe en la clase World. -->
  - [x] Agregar guardas de desarrollo (`__DEV__`) que congelen los componentes devueltos en modo de solo lectura para capturar mutaciones directas ilegales.
    <!-- Verificado 2025-02-22: COMPLETO. packages/core/src/ecs/World.ts:320-323 aplica Object.freeze() en DEV si __DEV__ es verdadero. El test en packages/core/tests/ecs.test.ts:46-72 valida que se lanza TypeError al intentar mutar un componente directo. -->

---

### 🎮 **Epic 4: Reducción de Duplicación y Gameplay Común**
* **Objetivo**: Centralizar las lógicas compartidas para evitar la reimplementación de comportamientos idénticos en múltiples juegos.
* **Tareas**:
  - [~] Extraer un sistema y tipos unificados de puntuación y combos para Space Invaders, Asteroids y Flappy Bird.
    <!-- Verificado 2025-02-22: PARCIAL. Se extrajeron el ComboComponent y ComboSystem genéricos en packages/core/src/games/arcade/ y se integraron con Space Invaders, pero la puntuación (score) se sigue manejando individualmente en cada minijuego y no está unificada. -->
  - [~] Centralizar el tratamiento de tablas de botín (`LootSystem`) en un paquete común `@tiny-aster/gameplay`.
    <!-- Verificado 2025-02-22: PARCIAL. Se centralizó la lógica en LootSystem en packages/core/src/games/arcade/systems/LootSystem.ts, pero no se ha extraído a un paquete común denominado @tiny-aster/gameplay. -->
  - [~] Unificar el manejo y matemática de controles móviles (joysticks virtuales) y soporte táctil bajo una API estándar compartida.
    <!-- Verificado 2025-02-22: PARCIAL. Se creó un JoystickSystem vacío en el core (packages/core/src/systems/JoystickSystem.ts), pero la matemática, lógica de control y gestos móviles están acoplados en componentes de UI de React Native bajo src/components/controls/VirtualJoystick.tsx. -->

---

## ✅ Épicas Completadas

### 🌐 **Epic 2: Desacoplamiento del Core y Soporte Headless**
* **Objetivo**: Asegurar que `@tiny-aster/core` sea un motor ECS totalmente agnóstico de plataforma y de UI, facilitando su ejecución en servidores headless.
* **Tareas**:
  - [x] Resolver duplicaciones de código estático y problemas de tipos en `SpatialCullingSystem`.
    <!-- Verificado 2025-02-22: COMPLETO. packages/core/src/systems/SpatialCullingSystem.ts está completamente unificado y libre de duplicaciones, y pasa exitosamente la suite de pruebas unitarias en packages/core/tests/SpatialCullingSystem.test.ts (pnpm test:ci). -->
  - [x] Mover todos los componentes y adaptadores dependientes de React, React Native, Reanimated y Skia a paquetes consumidores o módulos adaptadores externos (ej. `@tiny-aster/renderer-skia`, `@tiny-aster/react-native`).
    <!-- Verificado 2025-02-22: COMPLETO. Se comprobó con el script de límites scripts/check-core-boundaries.sh (pnpm run check:core-boundaries) que el core no importa dependencias de react-native, expo, skia, ni colyseus. Estas dependencias residen en paquetes externos especializados como packages/react-native/ y packages/renderer-skia/. -->
  - [x] Eliminar dependencias directas o implícitas de UI y plataforma del barrel de exportación principal (`src/index.ts` del core).
    <!-- Verificado 2025-02-22: COMPLETO. Se inspeccionó el barrel packages/core/src/index.ts y se confirmó que no realiza exportaciones de UI o APIs específicas de plataforma. -->
  - [x] Verificar la compilación autónoma del core para servidores headless (Node.js) mediante validaciones en CI.
    <!-- Verificado 2025-02-22: COMPLETO. El script pnpm run typecheck:core ejecuta exitosamente tsc -p tsconfig.json --noEmit en packages/core/, y pnpm run build:core compila el core autónomamente usando tsup para ESM/CJS (seguro para Node.js). -->

---

## 📈 Registro de Evolución

### Auditoría 2025-02-22
**Commit auditado:** 155a03d
**Épicas revisadas:** 1, 2, 3, 4

**Cambios de estado:**
- Epic 1 / "Restaurar e integrar AsteroidComboSystem": `[x]` ➔ `[~]` PARCIAL. No existe un archivo físico `AsteroidComboSystem`, pero se implementó `ComboSystem` y `ComboComponent` en `packages/core/src/games/arcade/` que hereda el rol, y la fuga de memoria del bus de eventos se solucionó a nivel base en `BaseGame.ts:182`.
- Epic 1 / "Implementar una máquina de estados explícita de ciclo de vida": `[ ]` ➔ `[ ]` No iniciado. Solo existe un booleano y representación parcial (`RUNNING`, `PAUSED`, `DESTROYED`), no una FSM de 6 estados.
- Epic 1 / "Validar con tests unitarios la idempotencia": `[ ]` ➔ `[~]` PARCIAL. La idempotencia de pause/resume está testeada con éxito, pero restart serializado no está implementado ni probado.
- Epic 2 / "Mover todos los componentes y adaptadores": `[ ]` ➔ `[x]` COMPLETO. El desacoplamiento es absoluto. El core pasa las validaciones de barreras con éxito.
- Epic 2 / "Eliminar dependencias directas del barrel principal": `[ ]` ➔ `[x]` COMPLETO. El barrel `index.ts` de core no tiene dependencias de UI.
- Epic 2 / "Verificar compilación autónoma del core": `[ ]` ➔ `[x]` COMPLETO. `pnpm run typecheck:core` y `pnpm run build:core` se completan sin errores.
- Epic 3 / "Modificar Query.getEntities()": `[ ]` ➔ `[ ]` No iniciado. Devuelve directamente la referencia al array cacheado interno en runtime.
- Epic 3 / "Separar operaciones de lectura": `[ ]` ➔ `[ ]` No iniciado. No existe ningún método `readComponent`.
- Epic 3 / "Asegurar mutaciones estructurales en commands": `[ ]` ➔ `[ ]` No iniciado. No hay aserciones en runtime de mutaciones directas durantes updates.
- Epic 3 / "Reemplazar World.version": `[ ]` ➔ `[~]` PARCIAL. Se crearon `tick`, `structureVersion` y `stateVersion`, pero `renderDirty` no está implementado.
- Epic 3 / "Agregar guardas de desarrollo (__DEV__)": `[ ]` ➔ `[x]` COMPLETO. Se implementó `Object.freeze()` en DEV y los tests unitarios lo validan de forma excelente.
- Epic 4 / "Extraer un sistema y tipos unificados de puntuación": `[ ]` ➔ `[~]` PARCIAL. Solo se crearon combo genérico pero no puntuación.
- Epic 4 / "Centralizar tratamiento de tablas de botín": `[ ]` ➔ `[~]` PARCIAL. `LootSystem` existe en arcade pero no en un paquete `@tiny-aster/gameplay`.
- Epic 4 / "Unificar el manejo y matemática de controles móviles": `[ ]` ➔ `[~]` PARCIAL. Existe `JoystickSystem` vacío en core, pero la matemática y control real sigue acoplado en la UI de React Native.

**Discrepancias encontradas:**
- `SESSION_LOG.md` (entrada de la sesión del 2025-02-22) afirmaba que los 8 objetivos prioritarios planteados en `docs/TODO.md` estaban 100% resueltos. Sin embargo, `docs/TODO.md` e `EPICS.md` son especificaciones de iniciativas distintas: `TODO.md` se centra en la estabilidad y el hardened del ECS (sprint de desarrollo), mientras que `EPICS.md` describe la hoja de ruta arquitectónica a largo plazo (algunas tareas de las cuales quedaron sin iniciar o se implementaron parcialmente, lo cual es normal). No se debe confundir la finalización del sprint de `TODO.md` con la compleción del 100% de `EPICS.md`.

**Tareas no verificables con certeza:**
- Ninguna. Todas las tareas de las 4 épicas fueron verificadas exhaustivamente comparando línea por línea y ejecutando comandos del monorepo.

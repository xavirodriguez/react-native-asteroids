# 🚀 Épicas Arquitectónicas (EPICS.md)

Este documento agrupa la hoja de ruta y las tareas pendientes en **Iniciativas Arquitectónicas (Epics)** integrales, facilitando una evolución estructurada y priorizada del motor de juego.

---

## 📅 Resumen de Épicas

```
┌────────────────────────────────────────────────────────┐
│ Epic 1: Estabilizar el Ciclo de Vida                   │ ➔ Prioridad 1 (Completada/Estable)
├────────────────────────────────────────────────────────┤
│ Epic 2: Desacoplamiento Core / Plataforma y Headless  │ ➔ Prioridad 2 (En Progreso)
├────────────────────────────────────────────────────────┤
│ Epic 3: API de Mutaciones Seguras e Invariantes ECS    │ ➔ Prioridad 3
├────────────────────────────────────────────────────────┤
│ Epic 4: Reducción de Duplicación y Gameplay Común     │ ➔ Prioridad 4
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Detalle de Épicas

### 🎬 **Epic 1: Estabilizar el Ciclo de Vida**
* **Objetivo**: Garantizar transiciones de estado deterministas, idempotentes y libres de memory leaks al inicializar, pausar, destruir o reiniciar juegos.
* **Tareas**:
  - [x] Unificar la gestión de ciclo de vida en `BaseGame` (autoridad única).
  - [x] Corregir la fuga de memoria y acumulación de listeners en el `EventBus` al reiniciar la simulación (limpieza explícita de sistemas y bus en `BaseGame.destroy()`).
  - [x] Restaurar e integrar `AsteroidComboSystem` con un patrón limpio de desuscripción mediante `dispose()`.
  - [ ] Implementar una máquina de estados explícita de ciclo de vida en `BaseGame` (`Uninitialized`, `Ready`, `Running`, `Paused`, `Stopped`, `Destroyed`).
  - [ ] Validar con tests unitarios la idempotencia de `pause()` / `resume()` y la ejecución serializada de `restart()`.

---

### 🌐 **Epic 2: Desacoplamiento del Core y Soporte Headless**
* **Objetivo**: Asegurar que `@tiny-aster/core` sea un motor ECS totalmente agnóstico de plataforma y de UI, facilitando su ejecución en servidores headless.
* **Tareas**:
  - [x] Resolver duplicaciones de código estático y problemas de tipos en `SpatialCullingSystem`.
  - [ ] Mover todos los componentes y adaptadores dependientes de React, React Native, Reanimated y Skia a paquetes consumidores o módulos adaptadores externos (ej. `@tiny-aster/renderer-skia`, `@tiny-aster/react-native`).
  - [ ] Eliminar dependencias directas o implícitas de UI y plataforma del barrel de exportación principal (`src/index.ts` del core).
  - [ ] Verificar la compilación autónoma del core para servidores headless (Node.js) mediante validaciones en CI.

---

### 🛡️ **Epic 3: API de Mutaciones Seguras e Invariantes del ECS**
* **Objetivo**: Endurecer el ECS previniendo mutaciones accidentales del estado interno o corrupción estructural del mundo.
* **Tareas**:
  - [ ] Modificar `Query.getEntities()` para que devuelva un objeto de lectura o una copia inmutable, evitando exponer el array interno cacheado.
  - [ ] Separar de manera estricta las operaciones de lectura (`readComponent`) de las de modificación de datos (`mutateComponent`).
  - [ ] Asegurar que las mutaciones estructurales (crear/destruir entidades, añadir/eliminar componentes) durante la fase de actualización pasen únicamente por `world.commands` (CommandBuffer estructural).
  - [ ] Reemplazar la propiedad sobrecargada `World.version` por contadores semánticos independientes: `stateVersion`, `structureVersion`, `renderDirty` y `tick`.
  - [ ] Agregar guardas de desarrollo (`__DEV__`) que congelen los componentes devueltos en modo de solo lectura para capturar mutaciones directas ilegales.

---

### 🎮 **Epic 4: Reducción de Duplicación y Gameplay Común**
* **Objetivo**: Centralizar las lógicas compartidas para evitar la reimplementación de comportamientos idénticos en múltiples juegos.
* **Tareas**:
  - [ ] Extraer un sistema y tipos unificados de puntuación y combos para Space Invaders, Asteroids y Flappy Bird.
  - [ ] Centralizar el tratamiento de tablas de botín (`LootSystem`) en un paquete común `@tiny-aster/gameplay`.
  - [ ] Unificar el manejo y matemática de controles móviles (joysticks virtuales) y soporte táctil bajo una API estándar compartida.

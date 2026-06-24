# ROADMAP DE REFACTORIZACIÓN `@tiny-aster`

## FASE 0: Diagnóstico y Alertas Pasivas
- [x] Tarea 0.1: Configurar regla de ESLint/Biome para lanzar WARNINGS (no error) al importar desde `src/engine/` en la app.
- [ ] Tarea 0.2: Crear un script básico de telemetría o documentar el "Benchmark Cero" (FPS, uso de memoria estimado en el JS Thread para Asteroids/Pong legacy).
- [x] Tarea 0.3: Implementar un "Smoke Test de Tipado" en `packages/core` que inicialice un mundo ficticio con 2 componentes y 1 sistema para validar la inferencia de tipos sin verbosidad.

## FASE 1: El Core Mínimo Viable (MVP Core)
- [x] Tarea 1.1: Portar `FrameScheduler` básico (unificar loops de juego) a `packages/core`.
- [ ] Tarea 1.2: Portar lógica física de movimiento lineal elemental (sin fricciones complejas ni colisiones avanzadas).
- [x] Tarea 1.3: Definir interfaces y contratos mínimos de renderizado (`Renderer<T>`) en el core.
- [x] Tarea 1.4: Configurar `src/engine/index.ts` como un pasamanos (re-export) exclusivo de los módulos migrados en esta fase.

## FASE 2: Primera Cabeza de Playa (Migración Vertical del Primer Juego)
- [ ] Tarea 2.1: Crear el paquete `packages/react-native` y extraer los hooks esenciales (`useGameLoop`, `useWorld`) consumiendo solo `@tiny-aster/core`.
- [ ] Tarea 2.2: Desconectar el juego más simple (ej: PongGame) de `src/engine` y reescribir sus sistemas usando el nuevo `@tiny-aster/core`.
- [ ] Tarea 2.3: Extraer el primer adaptador de renderizado a su propio paquete (ej: `packages/renderer-canvas` o similar).
- [ ] Tarea 2.4: Ejecutar test de estrés temprano en el juego migrado para asegurar que el ECS genérico no degrada los FPS respecto al Benchmark Cero.

## FASE 3: Migración en Masa y Desacoplamiento
- [ ] Tarea 3.1: Portar al core los sistemas complejos rezagados: colisiones circulares/poligonales deterministas y sistema de límites (`Boundary`).
- [ ] Tarea 3.2: Migrar por completo `AsteroidsGame` al nuevo `@tiny-aster/core`.
- [ ] Tarea 3.3: Extraer `packages/renderer-skia` de forma limpia y aislada.
- [ ] Tarea 3.4: Extraer `packages/network-colyseus` para la lógica multiplayer.
- [ ] Tarea 3.5: Migrar `useMultiplayer` y los providers globales de la app para consumir los nuevos adaptadores.

## FASE 4: El Apagón del Legacy
- [ ] Tarea 4.1: Cambiar la regla de ESLint/Biome de WARNING a ERROR para imports de `src/engine/`. El CI debe fallar si alguien la usa.
- [ ] Tarea 4.2: Eliminar físicamente la carpeta `src/engine/`.
- [ ] Tarea 4.3: Limpiar configuraciones del monorepo, alias en `tsconfig.json` y dependencias muertas en `package.json`.

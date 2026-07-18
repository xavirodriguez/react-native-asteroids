# Technical Debt Roadmap - Tiny Aster Engine

## Fase 1: Arquitectura y Límites (Crítico)
### Tareas
- [ ] Implementar un "Input Bridge" para desacoplar la UI de React del mundo ECS. (Prioridad: P0, Esfuerzo: Medio)
- [x] Eliminar casts `as unknown as AsteroidsGame` en componentes de React. (Prioridad: P1, Esfuerzo: Medio)
- [ ] Centralizar la gestión de `KeepAwake` y servicios de audio en un Provider. (Prioridad: P1, Esfuerzo: Bajo)

## Fase 2: Performance Core (Alta)
### Tareas
- [x] Optimizar `World.entities` eliminando el sort en cada acceso. (Prioridad: P1, Esfuerzo: Bajo)
- [x] Investigar migración de Snapshot a SoA (TypedArrays) para reducir GC. (Prioridad: P1, Esfuerzo: Muy Alto)
- [ ] Implementar pooling de entidades para evitar recreación de objetos. (Prioridad: P2, Esfuerzo: Medio)

## Fase 3: Tipado Estricto (Media)
### Tareas
- [ ] Cambiar `@typescript-eslint/no-explicit-any` de `warn` a `error`. (Prioridad: P1, Esfuerzo: Medio)
- [ ] Tipar estrictamente las queries ECS en la UI. (Prioridad: P2, Esfuerzo: Bajo)
- [x] Validar esquemas de configuración con Zod en tiempo de carga. (Prioridad: P2, Esfuerzo: Bajo)

## Fase 4: Networking y Sincronización (Media)
### Tareas
- [ ] Protocolo binario para mensajes de red frecuentes. (Prioridad: P2, Esfuerzo: Medio)
- [x] Capturar estado completo del RNG en snapshots. (Prioridad: P2, Esfuerzo: Bajo)
- [ ] Mejorar visualización de latencia y reconciliación en DebugOverlay. (Prioridad: P3, Esfuerzo: Bajo)

## Fase 5: Testing y CI/CD (Baja)
### Tareas
- [ ] Añadir tests de integración para el bridge React-ECS. (Prioridad: P2, Esfuerzo: Medio)
- [ ] Automatizar chequeos de tamaño de bundle y assets. (Prioridad: P3, Esfuerzo: Bajo)

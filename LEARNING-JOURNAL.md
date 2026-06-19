# Learning Journal - React Native Asteroids Refactor

## Baseline Audit (Jules - Senior Game Engine Architect)

### Technical Debt Scan
- **ECS Core (`packages/core`):** 99 occurrences of `any` across 42 files.
- **Inconsistent Generics:** `World` and `BaseGame` have leaky generics. Specifically, `getCommandBuffer()` in `World.ts` is missing `TEvents`, which breaks the command chain.
- **Monorepo health:** Found a `package-lock.json` in `server/`, which conflicts with the root `pnpm` workspace.
- **Documentation:** `architecture.md` and other DX guides are missing.

### Senior Quality Standards
1. **Zero `any` policy:** `any` is only allowed in very specific, documented low-level marshalling cases. Use `unknown` or generics instead.
2. **Generic Propagation:** All core classes (`World`, `System`, `BaseGame`, `CommandBuffer`) must propagate `TComponents`, `TEvents`, and `TBlueprints` consistently.
3. **Clean Architecture:** Core must remain 100% agnostic of game logic.
4. **Deterministic Simulation:** Ensure RNG and state management are isolated and serializable.

## Semana 1: Diagnóstico y Limpieza Profunda

### Día 1: Análisis completo + crear LEARNING-JOURNAL.md [COMPLETADO]
- Realizado escaneo quirúrgico de `any`.
- Identificados fallos de propagación genérica en el core.
- Definidos los estándares de calidad para el refactor.

### Próximos pasos (Semana 1)
- **Día 2:** Limpiar lockfiles y estandarizar scripts de Turbo.
- **Día 3-4:** Hardening del Core ECS y EventBus (Eliminar `any` y arreglar genéricos).
- **Day 5:** Estabilización de AssetLoader y Blueprints.
- **Day 6-7:** Migración de `AsteroidsGame` al nuevo core 100% tipado.

---
*(Actualizado por Jules)*

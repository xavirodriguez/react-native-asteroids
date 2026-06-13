# Learning Journal - React Native Asteroids Refactor

## Semana 1: Diagnóstico y Limpieza Profunda

### Día 1-2: Análisis y Configuración de Monorepo
- **Estado Inicial:** `packages/core` incompleto y roto.
- **Acciones:** Configuración de `pnpm-workspace.yaml`, `turbo.json` y corrección de scripts en `package.json`.

### Día 3-5: Reconstrucción del Core ECS y Eliminación de Deuda Técnica
- **ECS Genérico:** Se ha implementado una arquitectura basada en `ComponentRegistry` y `EventRegistry` genéricos. El `World` ahora es totalmente agnóstico al dominio del juego.
- **Estabilización:** Se han completado las definiciones en `CoreComponents.ts` y `RandomService.ts` para que todos los sistemas integrados (`MovementSystem`, `ParticleSystem`, `HierarchySystem`, etc.) funcionen con tipos estrictos.
- **Type Safety:** Se ha eliminado el uso de `any` en las APIs públicas del core, incluyendo el `EventBus` y el `WorldCommandBuffer`.
- **Build exitoso:** `packages/core` ahora pasa `typecheck` y genera artefactos vía `tsup`.

**Decisiones Arquitectónicas Clave:**
- **Inversión de Dependencias:** El core no importa nada de los juegos. Los juegos inyectan sus tipos y blueprints en el `World`.
- **Command Buffer Tipado:** Permite operaciones diferidas manteniendo la inferencia de tipos de componentes.
- **Jerarquías Genéricas:** El `HierarchySystem` ahora trabaja sobre cualquier componente que implemente `IHierarchicalComponent`, aunque por defecto se enfoca en `Transform`.

---
*(Próxima actualización: Día 6 - Migración de AsteroidsGame)*

# Code Smells Audit - Tiny Aster Engine

## Large Files (God Objects)
## Severidad
Medium
## Categoría
Complejidad
## Ubicación
`packages/core/src/ecs/World.ts`
## Descripción
La clase `World` acumula demasiadas responsabilidades: gestión de entidades, componentes, sistemas, snapshots, versiones y recursos.
## Evidencia
Archivo con más de 400 líneas gestionando múltiples subsistemas.
## Consecuencias
Difícil de mantener y testear. Alta probabilidad de efectos secundarios al modificar una parte.
## Solución propuesta
Delegar responsabilidades a gestores internos (EntityManager, ComponentManager, SnapshotManager) y usar composición en `World`.
## Dificultad
Media
## Prioridad
P2

---

## Magic Strings for Component Types
## Severidad
Low
## Categoría
DX
## Ubicación
General
## Descripción
Se usan strings literales para referenciar tipos de componentes en queries y mutaciones en lugar de usar constantes o el registro de tipos.
## Evidencia
`world?.query("LocalPlayer" as any)`
## Consecuencias
Propensión a errores tipográficos y dificultad para renombrar componentes.
## Solución propuesta
Usar un Enum o constantes exportadas desde el registro de componentes de cada juego.
## Dificultad
Baja
## Prioridad
P3

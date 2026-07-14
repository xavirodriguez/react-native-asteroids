# API Audit - Tiny Aster Engine

## Inconsistent Public API for Game Classes
## Severidad
Medium
## Categoría
API
## Ubicación
`packages/core/src/runtime/BaseGame.ts`
## Descripción
Los métodos expuestos para la UI no son consistentes entre diferentes juegos, lo que obliga a usar casts en la capa de React.
## Evidencia
Uso de `(game as unknown as AsteroidsGame)` en la UI.
## Consecuencias
Dificultad para crear componentes de UI genéricos que funcionen con cualquier juego del motor.
## Solución propuesta
Definir una interfaz robusta e inmutable para la interacción UI-Engine.
## Dificultad
Media
## Prioridad
P2

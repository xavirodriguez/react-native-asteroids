# ADR 004: Abstracción de Sistemas Core y Exclusión de Integración Física

## Contexto
Los sistemas base del motor (`MovementSystem`, `FrictionSystem`, `BoundarySystem`) estaban acoplados a componentes específicos de gameplay (como `"Ship"`) para evitar la doble integración de entidades que gestionan su propia física. Este acoplamiento violaba la modularidad y dificultaba la reutilización del motor en otros juegos sin arrastrar dependencias de Asteroids.

## Problema
- **Acoplamiento**: El core del motor conocía componentes de dominio de juego.
- **Ambigüedad**: No existía una forma estándar de decirle al motor "yo me encargo de mover esta entidad".
- **Fragilidad**: Añadir nuevas entidades con física personalizada requería modificar el código del motor.

## Decisión
Introducir `ManualMovementComponent` como un componente de "opt-out" en el motor core.

1. **Componente de Señalización**: `ManualMovementComponent` (tag puro) se añade a `CoreComponents.ts`.
2. **Refactor de Sistemas**: Los sistemas `MovementSystem`, `FrictionSystem` y `BoundarySystem` comprueban la presencia de este componente para saltar su procesamiento.
3. **Consolidación de Utilidades**: `PhysicsUtils.integrateMovement` se endurece para ser más determinista y menos dependiente de "adivinar" propiedades.

## Consecuencias
- **Positivas**:
    - El motor es ahora 100% agnóstico al juego.
    - El usuario tiene control total y explícito sobre la autoridad de integración.
    - Se elimina la necesidad de checks por strings de gameplay en el core.
- **Negativas**:
    - Los desarrolladores deben recordar añadir este componente a entidades con física manual compleja si usan los sistemas core simultáneamente.

## Plan de migración
- La nave de Asteroids ahora incorpora `ManualMovementComponent` de forma predeterminada en su factoría.
- La simulación determinista (`DeterministicSimulation.ts`) se ha actualizado para respetar este nuevo contrato.

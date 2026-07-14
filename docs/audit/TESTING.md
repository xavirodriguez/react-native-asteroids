# Testing Audit - Tiny Aster Engine

## Low Unit Test Coverage for Systems
## Severidad
Medium
## Categoría
Testing
## Ubicación
`packages/core/tests/`
## Descripción
Muchos sistemas ECS complejos carecen de tests unitarios que verifiquen su comportamiento de forma aislada.
## Evidencia
Escasez de archivos `.test.ts` en las carpetas de sistemas comparado con la cantidad de lógica implementada.
## Consecuencias
Alta probabilidad de regresiones al optimizar el core o añadir nuevas funcionalidades.
## Solución propuesta
Implementar una suite de tests unitarios para cada sistema base (Movement, Collision, etc.) usando un World mock.
## Dificultad
Media
## Prioridad
P2

---

## Lack of Integration Tests for React-ECS Bridge
## Severidad
Medium
## Categoría
Testing
## Ubicación
`src/hooks/`
## Descripción
Los hooks como `useGame` que gestionan el ciclo de vida del juego no tienen tests que aseguren que `init`, `start` y `destroy` se llamen correctamente.
## Evidencia
No se encontraron tests para los hooks de integración.
## Consecuencias
Memory leaks o estados inconsistentes al navegar entre pantallas.
## Solución propuesta
Usar `@testing-library/react-native` para testear los hooks y su interacción con instancias mock de los juegos.
## Dificultad
Media
## Prioridad
P2

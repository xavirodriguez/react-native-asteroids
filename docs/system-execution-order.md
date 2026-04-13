# Orden de Ejecución de Sistemas

## El Ciclo del Frame
El motor garantiza un orden de ejecución estricto basado en **Fases** y **Prioridades**. Esto previene problemas de "frame-behind" donde un sistema lee datos que aún no han sido actualizados por su dependencia lógica.

`BaseGame` impone un pipeline de alto nivel en cada tick del `GameLoop`:
1.  **Interpolation Prep**: Snapshot de transformaciones.
2.  **Input Handling**: Captura y aplicación de comandos.
3.  **Simulation Update**: Ejecución de sistemas registrados en el `World`.
4.  **Hierarchy System**: Propagación final de transformaciones de mundo.

## Fases Estándar (`SystemPhase`)

| Fase | Responsabilidad | Ejemplo de Sistemas |
|------|-----------------|---------------------|
| **Input** | Procesar hardware y red | `UnifiedInputSystem`, `AIController` |
| **Simulation** | Integración física básica | `MovementSystem`, `FrictionSystem` |
| **Collision** | Detección y respuesta | `CollisionSystem`, `SpatialHashUpdate` |
| **GameRules** | Lógica de alto nivel | `ScoreSystem`, `WaveSystem` |
| **Presentation**| Efectos y preparación | `ScreenShakeSystem`, `RenderUpdateSystem` |

## Algoritmo de Ordenación
En cada `world.update()`, si la lista de sistemas ha cambiado (`systemsNeedSorting`), el World realiza un sort basado en:
1. El peso de la **Fase** (definido en `SystemPhase`).
2. La **Prioridad** numérica (valores más altos se ejecutan antes dentro de una misma fase).

## Ciclo de Vida del Sistema
1. **Registro**: Los sistemas se añaden al mundo mediante `world.addSystem(system, { phase, priority })`.
2. **Update**: Se ejecutan secuencialmente en cada tick lógico (60Hz).
3. **Cleanup**: Al destruir el mundo o la escena, los sistemas deben limpiar recursos externos (como listeners de red o timers) si los tuvieran.

## Consecuencias de Alterar el Orden
- Si el `CollisionSystem` se ejecuta antes que el `MovementSystem`, los proyectiles podrían atravesar paredes en el frame de impacto (tunneling).
- Si el `RenderUpdateSystem` (que prepara los trails y rotaciones visuales) se ejecuta antes que la simulación física, el renderizado mostrará una posición "vieja", causando jitter visual.

## Dependencias Críticas Observadas

1.  **InterpolationPrepSystem → Simulation**: Debe capturar el estado *antes* de que los sistemas de simulación muten la posición para permitir la interpolación visual suave.
2.  **Simulation → Collision**: Los objetos deben moverse a su nueva posición potencial antes de que el motor de colisiones resuelva penetraciones.
3.  **Collision → GameRules**: La lógica de puntuación y daño depende de los eventos de colisión generados en el tick actual.
4.  **HierarchySystem → Presentation**: Debe resolver las coordenadas globales después de que todas las transformaciones locales hayan sido calculadas.
5.  **Input System → Simulation**: El estado unificado de entrada debe estar listo antes de que cualquier sistema de movimiento o lógica de juego intente leer acciones.

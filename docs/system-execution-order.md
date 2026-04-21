# Orden de Ejecución de Sistemas

El orden en el que se ejecutan los sistemas es crítico para la estabilidad de la simulación. El motor utiliza un sistema de **Fases** y **Prioridades** para orquestar esta secuencia.

## Fases Estándar

Los sistemas se agrupan en las siguientes fases (definidas en `SystemPhase`), ejecutándose de arriba hacia abajo:

1. **Input**: Procesamiento de entradas.
   - *Sistemas Típicos*: `UnifiedInputSystem`, `NetworkSyncSystem`.
   - *Importante*: Debe ejecutarse antes de que cualquier lógica tome decisiones basadas en las acciones del jugador.

2. **Simulation**: Lógica principal de movimiento y comportamiento.
   - *Sistemas Típicos*: `MovementSystem`, `FrictionSystem`, `AISystem`, `ParticleSystem`.
   - *Importante*: Actualiza las coordenadas locales de las entidades.

3. **Collision**: Detección y resolución física.
   - *Sistemas Típicos*: `CollisionSystem2D`, `PhysicsSystem2D`.
   - *Importante*: Debe ocurrir después del movimiento para detectar solapamientos en la nueva posición.

4. **GameRules**: Lógica de alto nivel y reglas del juego.
   - *Sistemas Típicos*: `DamageSystem`, `ScoreSystem`, `TTLSystem`.
   - *Importante*: Procesa las consecuencias de las colisiones y el estado del mundo.

5. **Presentation**: Preparación para el renderizado.
   - *Sistemas Típicos*: `AnimationSystem`, `RenderUpdateSystem`.
   - *Importante*: No debe alterar el estado físico, solo datos visuales (colores, frames de animación).

## Prioridades dentro de una Fase

Dentro de una misma fase, los sistemas se ordenan por su valor de `priority`:
- Valores **mayores** se ejecutan **antes**.
- Prioridad por defecto: 0.

## Caso Especial: Sistemas Fuera de `world.update()`

Existen sistemas que el motor ejecuta de forma manual en `BaseGame` por razones de integridad estructural:

- **InterpolationPrepSystem**: Se ejecuta antes que todo el pipeline de sistemas para asegurar que el snapshot previo sea puro.
- **HierarchySystem**: Se ejecuta después de todo el pipeline para asegurar que los cambios de posición local se propaguen correctamente al mundo antes de que el renderer los lea.

## Consecuencias de un Orden Incorrecto

- **Lag de un Frame**: Si la jerarquía se calcula antes que el movimiento, los hijos parecerán "ir por detrás" de sus padres (jitter visual).
- **Phasing de Colisiones**: Si las colisiones se procesan antes que el movimiento, los objetos podrían atravesar paredes en un solo frame.
- **Detección Fantasma**: Si las reglas de juego se procesan antes que las colisiones, un jugador podría morir por una colisión que ya no existe (o viceversa).

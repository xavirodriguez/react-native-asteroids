# Ciclo de Ejecución (ECS Runtime Flow)

Este documento describe en detalle cómo fluye el tiempo y los datos dentro del motor durante un frame típico de ejecución.

## El Game Loop (Fixed Timestep)

El motor utiliza una implementación de "Fixed Timestep con Acumulador" para garantizar que la física sea determinista independientemente de los FPS de renderizado.

### Acumulador de Tiempo
- El motor intenta avanzar la simulación en pasos fijos de **16.67ms (60Hz)**.
- Si el frame real del navegador/dispositivo es más largo, el loop ejecuta múltiples "ticks" de simulación para recuperar el tiempo.
- Se implementa un límite de seguridad (`maxUpdatesPerFrame`) para evitar el "Spiral of Death" cuando la CPU no puede mantener el ritmo.

## Pipeline del Tick de Simulación

Cada tick de simulación (Fixed Update) sigue este orden riguroso definido en `BaseGame.ts`:

### 1. Fase de Preparación (Pre-Update)
- **InterpolationPrepSystem**: Captura las posiciones actuales en el componente `PreviousTransform`. Esto es crítico para que el renderer sepa desde dónde interpolar si el tick termina antes del siguiente frame de dibujo.

### 2. Fase de Entrada (Input Phase)
- El `UnifiedInputSystem` lee el estado acumulado de las teclas y botones.
- Se procesan los `overrides` (entradas forzadas por red o UI táctil).
- El estado resultante se almacena en el componente singleton `InputState`.

### 3. Fase de Escena / Mundo (Simulation Phase)
- Si hay una escena activa via `SceneManager`, se actualiza.
- Si no, se ejecuta `world.update()`, que procesa los sistemas registrados en sus fases:
  1. `Simulation`: Movimiento, gravedad, IA.
  2. `Collision`: Detección y resolución de impactos.
  3. `GameRules`: Puntuación, lógica de victoria/derrota, TTL.
  4. `Presentation`: Preparación de animaciones y efectos.

### 4. Fase de Jerarquía (Post-Update)
- El `HierarchySystem` calcula las coordenadas de mundo finales para todas las entidades. Es esencial que ocurra después de que la física haya movido los objetos locales.

### 5. Flush de Estructura (Atomic Flush)
- El `World` procesa el `WorldCommandBuffer`. Las entidades marcadas para destrucción se eliminan y los nuevos componentes se adjuntan definitivamente.

## Fase de Renderizado (Variable Step)

Independientemente de cuántos ticks de simulación hayan ocurrido, el renderizado se ejecuta una vez por frame visual:

1. **Cálculo de Alpha**: `alpha = accumulator / fixedDeltaTime`. Representa qué tan lejos estamos entre el tick anterior y el próximo.
2. **Snapshot**: El renderer crea un snapshot donde cada posición de entidad es `lerp(Previous, Current, alpha)`.
3. **Draw**: Se ejecutan los comandos de dibujo sobre el backend (Canvas o Skia).

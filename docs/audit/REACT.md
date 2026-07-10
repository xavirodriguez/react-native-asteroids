# React Native Integration Audit - TinyAster

This document audits the integration layer between React Native/Expo and the synchronous Entity Component System (ECS) engine.

---

## Technical Audit Findings

### 1. High-Frequency React State Updates From Custom Hooks

## Título
Inundación de Re-renders: El Hook `useGame` Fuerza Actualizaciones de Estado en Cada Tick

## Severidad
High

## Categoría
React

## Ubicación
`packages/react-native/src/hooks/useGame.ts` o su equivalente `src/hooks/useAsteroidsGame.ts`

## Descripción
El motor de juego corre a un paso de simulación fijo (por lo general, a 60 ticks por segundo). Si el hook puente de React (`useGame` o similar) se suscribe de manera directa a los ticks del ciclo de juego para actualizar un estado de React (`useState`), forzará a todo el árbol de componentes React de la pantalla a re-renderizarse 60 veces por segundo. React no está diseñado para gestionar flujos de datos a 60Hz a través de su reconciliador virtual de DOM/Fibra, lo que provoca una enorme sobrecarga de CPU en la interfaz táctil y ralentiza la tasa general de frames del juego.

## Evidencia
En `src/hooks/useAsteroidsGame.ts`:
```typescript
  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<AsteroidsGame, GameStateComponent, InputState>(
      AsteroidsGame,
      isMultiplayer,
      { initialState: INITIAL_GAME_STATE }
    );
```
Si el estado `gameState` se actualiza de manera constante a través de React, cualquier componente visual (como botones de control, marcadores o el canvas en sí) se renderizará de forma redundante y pesada.

## Consecuencias
- **Picos de Consumo de Hilo de UI**: El hilo de UI de React Native se satura procesando de manera innecesaria el marcado XML/React de elementos estáticos, degradando los FPS y provocando retraso en la detección de gestos de los botones de disparo/empuje.
- **Micro-stutters**: El motor físico puede correr fluidamente a 60Hz, pero la visualización se verá entrecortada porque React detiene el motor de renderizado al intentar reconciliar nodos del árbol de UI.

## Solución propuesta
1. **Separar UI estática de UI dinámica**: No propagar todo el estado del juego (`gameState`) a través del mecanismo de estado convencional de React.
2. **Uso de Referencias y Suscripciones Directas (Refs)**: Los valores numéricos de alta frecuencia (como el puntaje actual, las coordenadas del jugador o la barra de salud) deben actualizarse mediante manipulación directa de nodos (empleando `useImperativeHandle`, `refs`, o componentes optimizados como `Animated` de Reanimated o `Skia` Canvas que no dependan del re-renderizado global del árbol de React).

## Dificultad
Alta

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. Duplicación de Estado en los Puentes de Inicialización de Juegos

## Título
Inconsistencia de Datos: Redundancia entre el Estado del World ECS y el Estado del Wrapper React

## Severidad
Medium

## Categoría
Duplicación

## Ubicación
`src/hooks/useAsteroidsGame.ts` y `src/types/GameTypes.ts`

## Descripción
Existe una duplicación evidente entre los esquemas de estado utilizados por la simulación pura ECS del juego (`world.getSingleton("GameState")`) y las definiciones de estado de React (`GameStateComponent`). La aplicación móvil mantiene estructuras de datos paralelas que actúan como clones intermedios. Copiar datos del mundo del ECS hacia estados de React e interconectar constantemente ambas fuentes de verdad abre la puerta a que queden fuera de sincronía, especialmente durante ciclos rápidos de reinicio, pausas o reconexión de red.

## Evidencia
En `src/hooks/useAsteroidsGame.ts`:
```typescript
export function useAsteroidsGame(isMultiplayer: boolean = false) {
  const { game, gameState, ... } =
    useGame<AsteroidsGame, GameStateComponent, InputState>(...);
```
El objeto `gameState` devuelto es una copia de sólo lectura del estado del singleton ECS, la cual se recrea de forma sistemática y pesada en cada ciclo de actualización.

## Consecuencias
- **Fallas de Sincronismo al Pausar/Reiniciar**: Durante un ciclo rápido de reinicio, el estado visual de la UI de React puede seguir mostrando un marcador de "Game Over" o el puntaje de la partida anterior porque el wrapper de React no ha completado su ciclo de reconciliación asíncrono, mientras que el mundo físico del ECS ya se encuentra simulando la nueva ronda.

## Solución propuesta
Consolidar el estado en una única fuente de verdad. El World de ECS debe reinar como el único custodio del estado activo. Los componentes visuales de React Native que requieran interactuar con él deben leer directamente los valores en demanda mediante selectores optimizados, o suscribirse de forma granular a eventos puntuales (ej. `"score:changed"`, `"game:over"`) del `EventBus` en lugar de estar clonando y propagando de forma ciega todo el estado de juego en cada cuadro.

## Dificultad
Media

## Prioridad
P2

## Dependencias
Ninguna.

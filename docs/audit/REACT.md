# React & Expo Audit - Tiny Aster Engine

## UI Throttling and State Desync
## Severidad
Medium
## Categoría
React
## Ubicación
`packages/react-native/src/hooks/useGame.ts`
`unsubscribe` callback
## Descripción
El hook `useGame` limita las actualizaciones del estado de React a 15 FPS para mejorar el rendimiento del hilo principal.
## Evidencia
```typescript
    const UI_UPDATE_INTERVAL = 1000 / 15; // Throttled to 15 FPS for UI components

    const unsubscribe = gameInstance.subscribe((state) => {
      gameStateRef.current = state as TState;

      const now = performance.now();
      const isPausedNow = gameInstance.isPausedState();
      if (isPausedNow !== isPausedRef.current || now - lastUpdateTime >= UI_UPDATE_INTERVAL) {
        // ...
        setGameState({ ...(state as TState) });
        // ...
      }
    });
```
## Consecuencias
- **Lag en la UI**: Elementos de la interfaz que dependen del `gameState` (ej: puntuación, combo, barras de vida) pueden sentirse lentos o dar saltos.
- **Desincronización**: La lógica de React puede estar operando con un estado que tiene hasta 66ms de antigüedad, lo cual es problemático para componentes interactivos o condicionales de renderizado.
## Solución propuesta
Diferenciar entre "Estado de Alta Frecuencia" (Game World) y "Estado de Baja Frecuencia" (UI Meta). Usar referencias para valores que cambian rápido o animaciones controladas por el Game Loop (ej: Reanimated shared values).
## Dificultad
Media
## Prioridad
P2

---

## Heavy Object Recreation in useGame
## Severidad
Low
## Categoría
React
## Ubicación
`packages/react-native/src/hooks/useGame.ts`
`setGameState({ ...(state as TState) });`
## Descripción
En cada actualización del estado de la UI (cada 15 FPS), se crea una copia superficial del objeto de estado completo.
## Evidencia
`setGameState({ ...(state as TState) });`
## Consecuencias
Presión innecesaria en el GC, especialmente si el objeto de estado es grande o anidado.
## Solución propuesta
Utilizar actualizaciones granulares o selectores para que solo los componentes que realmente necesitan una parte del estado se re-rendericen.
## Dificultad
Baja
## Prioridad
P3

---

## Multiple KeepAwake Hooks
## Severidad
Low
## Categoría
Expo
## Ubicación
`packages/react-native/src/hooks/useGame.ts`
## Descripción
Cada vez que se usa `useGame`, se activa un hook de `KeepAwake`. Si hay varios juegos o componentes usando este hook en una misma pantalla (o transiciones rápidas), puede haber conflictos o comportamientos inesperados en la gestión del brillo/bloqueo de pantalla.
## Evidencia
`useKeepAwake(!isPaused && isReady);`
## Consecuencias
Consumo excesivo de batería si no se limpia correctamente.
## Solución propuesta
Mover la gestión de `KeepAwake` a un nivel superior (Provider) o asegurar una gestión centralizada del estado "In-Game".
## Dificultad
Baja
## Prioridad
P3

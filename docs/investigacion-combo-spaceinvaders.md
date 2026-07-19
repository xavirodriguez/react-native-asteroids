# Informe de Investigación: Sincronización de Combo en Space Invaders

## 1. Resumen del funcionamiento actual de la sincronización

Actualmente, el sistema de combo en Space Invaders está duplicado entre el componente genérico del core `"Combo"` (gestionado por `ComboSystem`) y el componente de estado local del juego `"GameState"` (gestionado por `SpaceInvadersGameStateSystem`).

La sincronización y flujo de datos ocurre de la siguiente manera:

1. **Creación del estado de duplicación**: En `packages/core/src/games/space-invaders/EntityFactory.ts` (línea 250), al inicializarse el estado del juego, se adjuntan tanto el componente genérico `"Combo"` como el componente local `"GameState"` a la misma entidad singleton de estado:
   - `createGameState(world)` crea la entidad y le agrega `GameStateComponent` (con campos locales de combo: `combo`, `multiplier` y `comboTimerRemaining`).
   - También le añade `ComboComponent` (con campos genéricos: `combo`, `multiplier`, `timerRemaining`, `timerDuration`).

2. **Incremento en colisiones (Kills)**: En `packages/core/src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts` (línea 110), cuando un disparo del jugador destruye un invasor:
   - Se recupera la entidad `GameState` y se muta únicamente su componente genérico `"Combo"` incrementando `c.combo`, recalculando `c.multiplier` y reiniciando `c.timerRemaining = c.timerDuration`.
   - Se calcula el puntaje final basado en el multiplicador resultante de esta mutación y se le suma a `gameState.score`.

3. **Decremento por tick del Core**: `ComboSystem` (`packages/core/src/games/arcade/systems/ComboSystem.ts`) se ejecuta en cada tick y actualiza el componente genérico `"Combo"`, decrementando `timerRemaining` por `deltaTime` y reseteando `combo = 0` / `multiplier = 1` si expira.

4. **Sincronización manual cada frame (El problema)**: En `packages/core/src/games/space-invaders/systems/SpaceInvadersGameStateSystem.ts` (línea 43), dentro de `updateGameState`:
   - Cada tick se lee el componente genérico `"Combo"` de la entidad `GameState`.
   - Si existe, se muta el componente local `GameStateComponent` de forma incondicional copiando los valores del componente `"Combo"` 1:1:
     ```typescript
     world.mutateSingleton("GameState", (gs) => {
       gs.combo = comboComp.combo;
       gs.multiplier = comboComp.multiplier;
       gs.comboTimerRemaining = comboComp.timerRemaining;
     });
     ```
   - Esto genera una mutación de `"GameState"` **todos los frames**, lo que incrementa la versión de estado (`stateVersion`) del mundo de forma incondicional, con los problemas de rendimiento y lógica explicados en la sección de impacto.

---

## 2. Respuestas detalladas a las preguntas clave

### 1. `ComboSystem` del core
* **¿Qué parámetros acepta el componente `Combo`?**
  El componente `ComboComponent` define la siguiente interfaz:
  - `combo`: Número de golpes consecutivos (resetea a 0 al expirar).
  - `multiplier`: Multiplicador de puntaje o daño.
  - `timerRemaining`: Tiempo restante en segundos para la expiración.
  - `timerDuration`: Duración total del timer que se restablece tras cada impacto.

* **¿Es configurable la velocidad de decremento del timer, o está hardcodeada?**
  La velocidad de decremento está hardcodeada en `ComboSystem.ts` a un decremento de tiempo real estándar (`c.timerRemaining -= deltaTime`). No existe un parámetro de velocidad o escala dentro del componente `"Combo"` para cambiar la velocidad con la que baja el tiempo.

* **¿Existe alguna forma de parametrizar un timer de expiración "rápido" sin tocar la lógica genérica del sistema?**
  Sí. El tiempo inicial de expiración se lee y restablece usando el parámetro `timerDuration` del componente. Al inicializar la entidad en `EntityFactory.ts`, el valor de `timerDuration` se lee de `config.COMBO_TIMEOUT / 1000` (que equivale a `2000 / 1000 = 2` segundos por defecto en Space Invaders). Como el temporizador simplemente vuelve a llenarse con `timerDuration` después de cada golpe, podemos cambiar la velocidad o "rapidez" de expiración simplemente ajustando `COMBO_TIMEOUT` en el archivo de configuración del juego (`space-invaders.json`), sin necesidad de tocar el código de `ComboSystem.ts`.

---

### 2. `SpaceInvadersGameStateSystem`
* **¿Qué campos exactos mantiene localmente para combo y con qué lógica se actualizan?**
  Mantiene en su `GameStateComponent` local tres campos idénticos:
  - `combo: number` (actualizado a 0 al inicio y reinicios).
  - `multiplier: number` (inicializado a 1).
  - `comboTimerRemaining: number` (inicializado a 0).

  **Lógica de actualización**:
  Estos campos **nunca se actualizan directamente ante una colisión o cambio directo**. Solo se modifican bajo dos circunstancias:
  1. Durante el reinicio de partida en `resetGameOverState(world)` donde se ponen a `0`, `1` y `0` respectivamente.
  2. En el método `updateGameState` cada tick/frame, donde se copian incondicionalmente y 1:1 desde el componente `"Combo"` genérico del core.

* **¿Cuál es la lógica exacta de sincronización hacia el componente `Combo` del core? ¿Se copian campos 1:1 o hay transformación?**
  La sincronización se realiza en una sola dirección: **desde `"Combo"` del core hacia `"GameState"` local**. Los campos se copian **1:1 y sin ninguna transformación**:
  - `gs.combo = comboComp.combo`
  - `gs.multiplier = comboComp.multiplier`
  - `gs.comboTimerRemaining = comboComp.timerRemaining`

* **¿En qué orden se ejecuta este sistema respecto a `ComboSystem` genérico dentro del `Schedule`?**
  De acuerdo con `SpaceInvadersGameScene.ts`:
  - `ComboSystem` se añade en la fase `SystemPhase.Simulation`.
  - `SpaceInvadersGameStateSystem` se añade en la fase `SystemPhase.GameRules`.

  El programador del motor (`Schedule.ts`) define el orden de las fases como:
  1. `SystemPhase.Input`
  2. `SystemPhase.Simulation` (ejecuta `ComboSystem`)
  3. `SystemPhase.Transform`
  4. `SystemPhase.Collision` (ejecuta `CollisionSystem2D`)
  5. `SystemPhase.GameRules` (ejecuta `SpaceInvadersCollisionSystem` y luego `SpaceInvadersGameStateSystem`)
  6. `SystemPhase.Presentation`

  **Análisis de divergencia**:
  Gracias a este orden secuencial estricto, no hay ninguna ventana temporal o frame donde los valores diverjan de cara al Renderizado o la UI.
  - Al iniciar el frame, `ComboSystem` decrementa/expira el combo en `Simulation`.
  - Luego, si hay colisiones, `SpaceInvadersCollisionSystem` procesa las muertes y actualiza/reinicia el componente `"Combo"` en `GameRules`.
  - Inmediatamente después, en la misma fase `GameRules`, `SpaceInvadersGameStateSystem` lee el valor final resultante y lo copia a `"GameState"`.
  - La fase de presentación visual (Render) ocurre después, por lo que la UI y el canvas siempre muestran un estado 100% consistente.

---

### 3. Consumidores del componente `Combo` del core
* **Lugares que leen el componente `Combo` del core**:
  Realizando una búsqueda global por `"Combo"`, se confirma que:
  - **No hay ningún sistema ni lógica genérica del core** (como render actualizado, físicas, snapshots genéricos, etc.) que dependa de la lectura del componente `"Combo"`.
  - Solo dos sistemas en toda la aplicación interactúan con el componente `"Combo"` de Space Invaders:
    1. `SpaceInvadersCollisionSystem.ts` (escribe en él al eliminar invasores).
    2. `SpaceInvadersGameStateSystem.ts` (lee de él para sincronizar).
  - En la UI de React / React Native:
    - `src/app/space-invaders/index.tsx` renderiza el componente flotante `ComboDisplay`:
      ```typescript
      <ComboDisplay multiplier={gameState?.multiplier || 1} isActive={true} />
      ```
      Este lee del `gameState` proporcionado por el hook `useSpaceInvadersGame`, el cual retorna directamente el singleton `GameStateComponent` (`game.getGameState()`).
    - En ningún momento la UI ni los hooks interrogan al componente de ECS `"Combo"` directamente.
  - Esto significa que toda la lectura externa e interfaz del usuario depende únicamente del componente `"GameState"` local.

---

### 4. Impacto real de la duplicación
* **¿Ocurre la doble mutación cada frame o solo al cambiar?**
  **Ocurre de forma incondicional cada frame**.
  Aunque el combo o el temporizador no varíen (por ejemplo, cuando el combo está inactivo en 0), la función `updateGameState` ejecuta en cada frame:
  ```typescript
  world.mutateSingleton("GameState", (gs) => { ... });
  ```
  Esto significa que el componente `"GameState"` es mutado constantemente en cada tick de simulación.

* **Estimación del coste relativo**:
  1. **Invalidación de `stateVersion`**: El motor ECS (`World.ts`) incrementa el `_stateVersion` de todo el mundo en cada mutación de componente. Al mutar `"GameState"` cada frame de forma incondicional, `_stateVersion` avanza al menos una vez por tick incluso en reposo. Esto destruye la capacidad de usar `stateVersion` para detectar si realmente ha habido cambios de estado lógicos.
  2. **Re-creación/Clonación de Componentes**: Si el motor está en modo de desarrollo (`__DEV__`), el componente retornado por `getComponent` se congela con `Object.freeze`. Al mutarlo con `mutateComponent`, se clona superficialmente el componente para descongelarlo (`ComponentCloner.cloneComponent`). Esto genera asignaciones de memoria y basura en memoria en cada frame que el recolector de basura (GC) debe limpiar, lo cual impacta el rendimiento en dispositivos móviles.
  3. **Impacto en Red / Multijugador**: Los sistemas de snapshots del motor (`SnapshotSerializer.ts`) comprueban las versiones de los componentes para enviar deltas serializados a través de la red en partidas multijugador. Al estar marcando `"GameState"` como mutado en cada frame, el serializador cree que el estado global ha cambiado por completo y se ve forzado a empaquetar y transmitir el estado en cada tick de red, desperdiciando ancho de banda y CPU.

---

## 3. Veredicto: Ruta Recomendada

### Veredicto: **Ruta B — Desacoplar del core** es la ruta óptima y 100% viable.

#### Justificación:
1. **Consistencia arquitectónica**: Flappy Bird y Pong ya gestionan su combo de forma 100% local, por lo que adoptar la Ruta B en Space Invaders unifica el enfoque de diseño en todos los juegos no-arcade del ecosistema.
2. **Impacto de cambios cero en la UI**: Dado que los componentes de la interfaz de usuario de React (como `ComboDisplay` y la barra de UI) ya están leyendo exclusivamente de `GameStateComponent`, desacoplar la lógica del core e implementarla localmente no requerirá ningún cambio en la UI ni en los hooks de React.
3. **Mantenibilidad**: Evita tener que sobrecargar o generalizar el sistema de combos del core (`ComboSystem`) con fórmulas de incremento y multiplicadores específicos de Space Invaders (como la progresión no lineal `1 + Math.floor(c.combo / 5)`).
4. **Optimización de performance**: Al eliminar la sincronización del loop principal, `"GameState"` solo se mutará cuando realmente cambie el combo (al matar un invasor) o cuando el temporizador esté activo decrepándose. Cuando no haya combo activo, la mutación será 0, protegiendo `stateVersion` y reduciendo la carga del GC.

---

## 4. Esbozo de los pasos para la implementación de la Ruta B

Si se decide implementar la **Ruta B (Desacoplar del core)** en el futuro, los pasos a seguir serían los siguientes:

### Paso 1: Eliminar el componente `"Combo"` de Space Invaders
1. **EntityFactory**: En `packages/core/src/games/space-invaders/EntityFactory.ts`, dentro de `createGameState`, eliminar la adición del componente `"Combo"`:
   ```typescript
   // Eliminar este bloque por completo:
   add({
     type: "Combo",
     combo: 0,
     multiplier: 1,
     timerRemaining: 0,
     timerDuration: config.COMBO_TIMEOUT / 1000,
   } as any);
   ```

2. **GameScene**: En `packages/core/src/games/space-invaders/scenes/SpaceInvadersGameScene.ts`, remover la importación y registro de `ComboSystem`:
   ```typescript
   // Eliminar la importación e instanciación:
   this.world.addSystem(new ComboSystem() as any, { phase: SystemPhase.Simulation });
   ```

### Paso 2: Actualizar la lógica de incremento en colisiones
En `packages/core/src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`, en lugar de mutar `"Combo"`, mutar directamente `"GameState"`:
```typescript
// Reemplazar la mutación del componente "Combo":
let nextCombo = 0;
let nextMultiplier = 1;

world.mutateSingleton("GameState", (gs) => {
  gs.combo++;
  gs.comboTimerRemaining = this.config!.COMBO_TIMEOUT / 1000;
  gs.multiplier = Math.min(this.config!.MAX_MULTIPLIER, 1 + Math.floor(gs.combo / 5));
  nextCombo = gs.combo;
  nextMultiplier = gs.multiplier;
});
```

### Paso 3: Implementar el decremento del temporizador localmente
En `packages/core/src/games/space-invaders/systems/SpaceInvadersGameStateSystem.ts`:
1. Remover el bloque de sincronización incondicional cada frame que copia los campos de `"Combo"` a `"GameState"`.
2. Agregar la lógica de decremento del temporizador en el método `updateGameState`. De este modo, la mutación de `"GameState"` por decremento de tiempo de combo solo ocurrirá si `comboTimerRemaining > 0`:
   ```typescript
   // Decrementar el temporizador localmente si está activo
   if (gameState.comboTimerRemaining > 0) {
     world.mutateSingleton("GameState", (gs) => {
       gs.comboTimerRemaining -= deltaTime;
       if (gs.comboTimerRemaining <= 0) {
         gs.comboTimerRemaining = 0;
         gs.combo = 0;
         gs.multiplier = 1;
       }
     });
   }
   ```

---
*Fin del informe de investigación.*

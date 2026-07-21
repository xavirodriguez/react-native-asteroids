# Asteroids Investigation Report

Este informe presenta los resultados de una investigación técnica exhaustiva realizada sobre el repositorio antes de proceder con la implementación del juego Asteroids. El objetivo principal es eliminar cualquier suposición, verificar el comportamiento real del código y garantizar la perfecta compatibilidad con la arquitectura del motor ECS existente.

---

## ✅ Confirmado

Tras la inspección y análisis del código real, se confirman las siguientes implementaciones, APIs y comportamientos:

### 1. Sistema de Tiempo de Vida (TTLSystem)
*   **Archivo:** `packages/core/src/systems/TTLSystem.ts`
*   **Nombre del componente:** `"TTL"` (interfaz `TTLComponent` definida en `packages/core/src/ecs/CoreComponents.ts`).
*   **Propiedades requeridas:**
    *   `remaining: number`: Representa el tiempo de vida restante en segundos. Es el campo funcional decrementado por `TTLSystem`.
    *   `timeLeft: number`: Aunque está declarado en la interfaz `TTLComponent`, **no es utilizado ni mutado por `TTLSystem.ts`**.
    *   `onCompleteEvent?: string`: Nombre de evento opcional que se emitirá de manera diferida si expira el tiempo.
*   **Lógica de eliminación de entidades:**
    Cuando `ttl.remaining <= 0` en el método `update()`, el sistema realiza secuencialmente:
    1.  Si `ttl.onCompleteEvent` está definido, emite un evento diferido mediante `world.getEventBus().emitDeferred()`.
    2.  Si la entidad cuenta con un componente `"Reclaimable"`, obtiene el recurso del pool usando `reclaimable.poolId` y libera la entidad llamando a `pool.release(entity)`.
    3.  Elimina la entidad de forma diferida mediante `world.getCommandBuffer().removeEntity(entity)`.

### 2. Comportamiento y Uso de EventBus
*   **Archivo:** `packages/core/src/events/EventBus.ts`
*   **Métodos principales:**
    *   `emit(event, payload)`: Notifica a los manejadores de forma **sincrónica e inmediata**. Puede causar desbordamientos de pila, problemas de mutabilidad o inconsistencias si se usa dentro de sistemas en plena iteración de actualización.
    *   `emitDeferred(event, payload)`: Encola el evento de manera segura en un buffer que será procesado y limpiado secuencialmente al final del frame a través de `flushDeferred()`.
*   **Uso en AsteroidCollisionSystem:** Es obligatorio utilizar `emitDeferred` para notificar eventos de colisión y gameplay (`ship:destroyed`, `asteroid:destroyed`, etc.) para evitar alterar el estado estructural del mundo en medio de la simulación física.

### 3. Random Determinista
*   **Archivos:** `packages/core/src/ecs/World.ts` y `packages/core/src/utils/RandomService.ts`
*   **APIs Deterministas:** Se debe emplear de manera exclusiva la instancia `world.gameplayRandom` (un `RandomService` bloqueado/sembrado) para toda la lógica de simulación (posiciones de reaparición, velocidades de fragmentos, etc.). Sus métodos principales son:
    *   `next(): number`: Retorna un número pseudoaleatorio flotante entre `[0, 1)`.
    *   `nextRange(min, max): number`: Retorna un número flotante en el rango especificado de manera determinista.
*   Se prohíbe terminantemente el uso de `Math.random()` en el gameplay, ya que corrompe el determinismo y rompe la sincronización en multijugador y la predicción/rollback.

---

## ⚠ Discrepancias encontradas

A través de la auditoría técnica, se han detectado contradicciones críticas entre el plan previsto y el código real que representan riesgos de implementación:

### 1. Fuente de verdad del Input (Singleplayer vs. Multiplayer)
*   **Archivos implicados:**
    *   `packages/core/src/games/asteroids/AsteroidsGame.ts`
    *   `packages/core/src/network/NetworkController.ts`
    *   `packages/core/src/network/ReplicationSystem.ts`
*   **Divergencia:**
    *   En **Singleplayer**, la UI interactúa mediante `setInputState(input)` en `AsteroidsGame.ts`. Éste busca el `LocalPlayer` y escribe directamente en el componente **`"InputState"`** (que tiene un mapa interno de botones planos: `buttons["left"]`, `buttons["right"]`, etc.).
    *   En **Multiplayer**, `NetworkController.applyInputToEntity` y `ReplicationSystem.ts` leen y escriben de forma exclusiva en el componente **`"Input"`** (que tiene flags específicos booleanos: `rotateLeft`, `rotateRight`, `thrust`, `shoot`, `hyperspace`).
*   **Impacto:** El sistema de replicación y predicción del cliente no reaccionará al input en singleplayer porque `"Input"` nunca se actualiza a través de `"InputState"`. Esto impide reutilizar los sistemas de simulación física y disparo de forma idéntica en ambos modos de juego.
*   **Corrección propuesta:** Unificar la fuente de verdad. El componente `"Input"` debe ser el componente de entrada único para la simulación de Asteroids. `setInputState` en `AsteroidsGame.ts` debe modificarse para mapear las entradas del usuario directamente sobre `"Input"` de la entidad `LocalPlayer`.

### 2. El Bug del Hiperspacio (Missing Hyperspace propagation)
*   **Archivos implicados:**
    *   `packages/core/src/games/asteroids/AsteroidsGame.ts` (líneas 244-255)
*   **Divergencia:** El método `setInputState(input)` no mapea la acción `hyperspace`:
    ```typescript
    if (input.thrust !== undefined) inputComp.buttons["thrust"] = input.thrust;
    if (input.shoot !== undefined) inputComp.buttons["shoot"] = input.shoot;
    if (input.rotateLeft !== undefined) inputComp.buttons["left"] = input.rotateLeft;
    if (input.rotateRight !== undefined) inputComp.buttons["right"] = input.rotateRight;
    // La acción hyperspace es completamente ignorada en Singleplayer
    ```
*   **Impacto:** El jugador local en singleplayer nunca podrá activar la habilidad de hiperspacio. En cambio, en multijugador `NetworkController.ts` sí propaga la acción `hyperspace` hacia `"Input"`.
*   **Corrección propuesta:** Añadir el mapeo de `hyperspace` a la unificación de inputs en `setInputState` escribiendo en `"Input"`.

### 3. Físicas Duplicadas e Inexistencia de `computeShipPhysics`
*   **Archivos implicados:**
    *   `packages/core/src/network/ReplicationSystem.ts`
*   **Divergencia:** El plan sugería reutilizar `computeShipPhysics()`. Sin embargo, **esta API no existe en el repositorio**. En su lugar, `ReplicationSystem.ts` duplica y hardcodea los cálculos de aceleración e impulso físico de la nave (`power = 150`, fórmulas trigonométricas de rotación, etc.) tanto en su método `update` como en `reconcile`.
*   **Impacto:** Cualquier discrepancia entre las constantes de `ReplicationSystem` y las constantes de física del asteroide/nave utilizadas en `AsteroidInputSystem` causará desincronizaciones visuales graves (jittering) durante la reconciliación del cliente multijugador.
*   **Corrección propuesta:** Centralizar las ecuaciones físicas de la nave. Es fundamental parametrizar estas constantes (aceleración, fricción, velocidad de rotación) y cargarlas desde `AsteroidConfig` en el world para que tanto el input local como el de replicación apliquen exactamente el mismo modelo matemático.

### 4. Incompatibilidad de GameState con Pong
*   **Archivos implicados:**
    *   `packages/core/src/games/pong/systems/PongGameStateSystem.ts`
    *   `packages/core/src/games/asteroids/systems/AsteroidGameStateSystem.ts`
*   **Divergencia:** La lógica de puntuación y fin de juego de Pong (enfocada en puntaje máximo competitivo de dos jugadores) es incompatible con la supervivencia por vidas y oleadas progresivas (niveles) de Asteroids.
*   **Corrección propuesta:** `AsteroidGameStateSystem` debe ser desarrollado independientemente extendiendo `BaseGameStateSystem`. Debe gestionar el incremento de nivel al eliminar todos los asteroides de la oleada, el decremento de vidas de la nave en el singleton `GameState` y en `HealthComponent`, la activación del respawn de la nave en el centro de la pantalla con invulnerabilidad temporal y la declaración de fin de juego cuando las vidas de la nave lleguen a 0.

### 5. Fragmentación de Asteroides Inexistente en el Motor
*   **Divergencia:** No existe ninguna clase o función utilitaria en el motor para la división/fragmentación de asteroides.
*   **Corrección propuesta:** Se debe desarrollar la fragmentación de forma manual en `AsteroidCollisionSystem` o mediante una fábrica. Al colisionar una bala con un asteroide grande o mediano, se deben spawnear dos fragmentos con un tamaño inferior, heredando la velocidad del asteroide padre combinada con un impulso divergente radial determinista utilizando `world.gameplayRandom`.

---

## APIs verificadas

Auditoría detallada del estado de las APIs asumidas en la simulación:

| API Asumida | Estado | Firma Real en el Código | Archivo |
| :--- | :--- | :--- | :--- |
| `EntityFactory.createShip` | ✅ Existe | `createShip(config: { world, x, y }): number` | `EntityFactory.ts` |
| `EntityFactory.createAsteroid` | ✅ Existe | `createAsteroid(config: { world, x, y, size }): number` | `EntityFactory.ts` |
| `EntityFactory.createBullet` | ❌ **No existe** | Debe ser implementada con los componentes reales. | `EntityFactory.ts` |
| `matchPair` | ⚠ Local | Método privado local no disponible globalmente. | `PongCollisionSystem.ts` |
| `world.getSingleton` | ✅ Existe | `getSingleton(type): Component \| undefined` | `World.ts` |
| `world.mutateSingleton` | ✅ Existe | `mutateSingleton(type, mutator): void` | `World.ts` |
| `world.query` | ✅ Existe | `query(...types): ReadonlyArray<Entity>` | `World.ts` |
| `world.mutateComponent` | ✅ Existe | `mutateComponent(entity, type, updater): boolean` | `World.ts` |
| `world.getCommandBuffer` | ✅ Existe | `getCommandBuffer(): WorldCommandBuffer` (Alias `world.commands`) | `World.ts` |
| `eventBus.emit` | ✅ Existe | `emit(event, payload): void` | `EventBus.ts` |
| `eventBus.emitDeferred` | ✅ Existe | `emitDeferred(event, payload): void` | `EventBus.ts` |

---

## Riesgos

Se identifican los siguientes riesgos antes de proceder con el desarrollo:

1.  **Desincronización en Reconciliación (Jittering):** Si la simulación física local de `AsteroidInputSystem` difiere un solo bit en la aceleración o fricción con respecto al modelo simplificado en `ReplicationSystem.ts`, la reconciliación provocará correcciones de posición bruscas de forma constante en el cliente multijugador.
2.  **Destrucción Doble de Bala:** Si una sola bala colisiona con dos asteroides solapados en el mismo tick de actualización, el sistema de colisiones notificará ambos eventos. Sin un control estricto que verifique si la bala ya ha sido eliminada (`world.hasEntity(bullet)`), la bala podría destruir dos asteroides a la vez e intentar liberarse al pool de balas por duplicado, corrompiendo la estructura de datos del pool.
3.  **Mutaciones Estructurales Inválidas:** Eliminar entidades directamente con `world.removeEntity()` en medio de las iteraciones de resolución de colisiones invalida los índices activos. Es un riesgo grave; se debe utilizar de manera rigurosa el buffer de comandos diferido `world.commands.removeEntity()`.
4.  **Uso Inapropiado del RNG gameplayRandom:** El uso de `world.gameplayRandom` en efectos meramente visuales (partículas visuales o vibración de pantalla) romperá la consistencia de la semilla determinista en el servidor autorizado. Los efectos visuales estéticos deben consumir de forma exclusiva `world.renderRandom`.

---

## Decisiones pendientes

1.  **Unificación del Cálculo de Físicas de la Nave:**
    *   *Opción A:* Refactorizar `ReplicationSystem.ts` para que extraiga los coeficientes de empuje y fricción desde un recurso o configuración centralizada, eliminando el valor hardcodeado `150`.
    *   *Opción B:* Implementar un helper compartido de físicas de nave que consuma constantes compartidas de `AsteroidConfig`.
2.  **Implementación del Respawn e Invulnerabilidad:**
    Decidir si tras el respawn del jugador se le dotará de un estado de invulnerabilidad (por ejemplo, deshabilitando su colisionador con `collider.enabled = false` o utilizando una propiedad de temporizador `invulnerableRemaining` en `HealthComponent`) y de qué manera se representará visualmente (parpadeo de opacidad en `RenderComponent`).

---

## Recomendación antes de implementar

Para mitigar todos los riesgos e inconsistencias y asegurar una integración perfecta con el motor:

1.  **Integrar el Puente de Inputs:** Modificar el método `setInputState` de `AsteroidsGame.ts` en singleplayer para mapear y actualizar directamente el componente unificado `"Input"` de la entidad `LocalPlayer`, incluyendo el flag de `hyperspace`. Esto garantiza que tanto en un jugador como en multijugador la simulación física de la nave opere de forma idéntica consumiendo el mismo componente de entrada.
2.  **Unificar Constantes de Simulación:** Parametrizar la aceleración, fricción y velocidad de rotación dentro de la configuración del juego (`AsteroidConfig`) para que todos los sistemas utilicen exactamente las mismas constantes y fórmulas trigonométricas de integración.
3.  **Desarrollar `createBullet` con el contrato real:** Garantizar que la fábrica inicialice de forma robusta todos los campos requeridos de `Transform`, `Velocity`, `Render`, `Bullet`, `TTL` (usando `remaining` para el sistema TTLSystem) y `Reclaimable` (con id `"BulletPool"` para su correcto reciclaje).
4.  **Diseñar el Sistema de Colisiones con Doble Validación:** Comprobar la existencia activa de ambas entidades mediante `world.hasEntity()` antes de procesar cada par, y filtrar de forma única con `entityA < entityB` para evitar la duplicidad de procesamiento en colisiones de un mismo frame.

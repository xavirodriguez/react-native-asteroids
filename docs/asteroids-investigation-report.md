# Asteroids Investigation Report

Este informe presenta los resultados de una investigación técnica exhaustiva del repositorio con el fin de eliminar suposiciones, verificar la implementación real de los sistemas y asegurar la compatibilidad absoluta con la arquitectura existente del motor antes de proceder con el desarrollo de Asteroids.

---

## ✅ Confirmado

Basándonos en la inspección directa del código fuente, confirmamos la existencia, firmas y comportamiento de los siguientes componentes, sistemas y utilidades:

### 1. TTLSystem
*   **Archivo:** `packages/core/src/systems/TTLSystem.ts`
*   **Nombre del componente:** `"TTL"` (`TTLComponent`, definido en `packages/core/src/ecs/CoreComponents.ts`).
*   **Propiedades requeridas:**
    *   `remaining: number`: El tiempo restante en segundos. Es el campo funcional decrementado por `TTLSystem`.
    *   `timeLeft: number`: Declarado en `TTLComponent` pero **no** utilizado/modificado por el sistema en su lógica de actualización.
    *   `onCompleteEvent?: string`: Evento opcional que se emite a través de `EventBus` de manera diferida cuando el tiempo expira (`ttl.remaining <= 0`).
*   **Comportamiento de eliminación:**
    Cuando `remaining <= 0`, el sistema realiza los siguientes pasos:
    1.  Si tiene `onCompleteEvent`, emite un evento diferido mediante `EventBus.emitDeferred()`.
    2.  Si la entidad tiene un componente `"Reclaimable"`, busca el pool correspondiente en los recursos usando `reclaimable.poolId` y devuelve la entidad llamando a `pool.release(entity)`.
    3.  Registra la eliminación en el buffer de comandos mediante `world.getCommandBuffer().removeEntity(entity)`.

### 2. EventBus y Emisión Diferida
*   **Archivo:** `packages/core/src/events/EventBus.ts`
*   **Comportamiento de emisión:**
    *   `emit()`: Ejecuta todos los manejadores del evento de forma **sincrónica e inmediata**. Esto es peligroso dentro de bucles de actualización o resolución de colisiones, ya que puede desencadenar mutaciones estructurales del mundo (añadir/eliminar componentes) en medio de una iteración.
    *   `emitDeferred()`: Coloca el evento en una cola (`primaryBuffer`), la cual se procesará y vaciará ordenadamente mediante `flushDeferred()` (llamado al final de cada paso de simulación).
*   **Uso obligatorio:** El sistema `AsteroidCollisionSystem` **debe utilizar `emitDeferred()`** para todos los eventos de gameplay (`ship:destroyed`, `asteroid:destroyed`, `score:changed`, `game:over`) para evitar romper iteraciones de sistemas de físicas y colisiones activos en ese mismo frame.

### 3. APIs Estándar del World y ECS
*   **Archivo:** `packages/core/src/ecs/World.ts`
*   Confirmamos que existen y tienen las firmas correctas:
    *   `world.mutateComponent(entity, type, updater)`: Modifica de forma segura un componente mutable (clonándolo en modo desarrollo si está congelado).
    *   `world.getComponent(entity, type)`: Obtiene el componente asociado (congelado en modo desarrollo para evitar mutaciones directas).
    *   `world.addComponent(entity, component)`: Registra un componente en una entidad.
    *   `world.removeComponent(entity, type)`: Quita un componente de una entidad.
    *   `world.getCommandBuffer()` (alias `world.commands`): Permite registrar operaciones estructurales diferidas (`createEntity`, `removeEntity`, `addComponent`, `removeComponent`).

### 4. Random determinista
*   **Archivo:** `packages/core/src/ecs/World.ts` y `packages/core/src/utils/RandomService.ts`
*   **Estado:** No debe utilizarse `Math.random` para lógica que deba ser determinista o replicable.
*   **APIs Deterministas:** Se debe utilizar exclusivamente `world.gameplayRandom` (instancia de `RandomService`), el cual implementa un generador pseudoaleatorio determinista y seguro para replicación y rollback. `RandomService` expone el método `next(): number` (retorna un float entre `[0, 1)`).

---

## ⚠ Discrepancias encontradas

A través de la auditoría técnica se han identificado contradicciones y bugs críticos que deben corregirse antes de continuar:

### 1. Fuente de verdad del Input (Divergencia entre Singleplayer y Multiplayer)
*   **Archivos implicados:**
    *   `packages/core/src/games/asteroids/AsteroidsGame.ts`
    *   `packages/core/src/network/NetworkController.ts`
    *   `packages/core/src/network/ReplicationSystem.ts`
    *   `packages/core/src/games/asteroids/types/AsteroidTypes.ts`
    *   `packages/core/src/ecs/CoreComponents.ts`
*   **Discrepancia:**
    *   En **Singleplayer**, el motor de Asteroids recibe los inputs llamando a `setInputState(input)`, el cual busca la entidad `LocalPlayer` y escribe directamente en el componente **`"InputState"`** (`InputStateComponent`, que usa un diccionario `buttons: Record<string, boolean>`).
    *   En **Multiplayer**, `NetworkController.ts` (en `applyInputToEntity`) y `ReplicationSystem.ts` operan exclusivamente con el componente **`"Input"`** (`InputComponent`, que utiliza flags directos como `rotateLeft`, `rotateRight`, `thrust`, `shoot`, `hyperspace`).
*   **Impacto:**
    La física y lógica de simulación de `ReplicationSystem.ts` leen exclusivamente `"Input"`. En singleplayer, `"Input"` nunca es actualizado porque el cliente escribe en `"InputState"`. Esto rompe el determinismo y la consistencia: los sistemas de simulación de Asteroids tendrían que implementar lógica duplicada o condicional para leer un componente u otro dependiendo del modo.
*   **Corrección propuesta:**
    Unificar la fuente de verdad utilizando **`"Input"`** como el componente exclusivo de simulación. `setInputState` en `AsteroidsGame.ts` debe modificarse en singleplayer para mapear los inputs recibidos directamente sobre el componente `"Input"` (o mantener sincronizados ambos componentes para no romper interfaces externas, pero que el gameplay siempre consuma `"Input"`).

### 2. El Bug de Hiperspacio (Missing Hyperspace propagation)
*   **Archivos implicados:**
    *   `packages/core/src/games/asteroids/AsteroidsGame.ts`
*   **Discrepancia:**
    El método `setInputState(input: Partial<InputState>)` de `AsteroidsGame.ts` ignora por completo la propiedad `hyperspace`:
    ```typescript
    if (input.thrust !== undefined) inputComp.buttons["thrust"] = input.thrust;
    if (input.shoot !== undefined) inputComp.buttons["shoot"] = input.shoot;
    if (input.rotateLeft !== undefined) inputComp.buttons["left"] = input.rotateLeft;
    if (input.rotateRight !== undefined) inputComp.buttons["right"] = input.rotateRight;
    // Falta: input.hyperspace
    ```
*   **Impacto:**
    Es físicamente imposible disparar el hiperspacio del jugador local en modo singleplayer a través de la interfaz estándar de entrada. Sin embargo, en `NetworkController.ts` sí se propaga el estado `actions.includes("hyperspace")` al componente `"Input"`.
*   **Corrección propuesta:**
    Añadir el mapeo de `hyperspace` en `setInputState` y asegurar que se escriba en el componente unificado `"Input"`.

### 3. Físicas Duplicadas y Hardcodeadas frente a la inexistencia de `computeShipPhysics`
*   **Archivos implicados:**
    *   `packages/core/src/network/ReplicationSystem.ts`
*   **Discrepancia:**
    El plan previo asume la existencia de una API unificada llamada `computeShipPhysics()`. Sin embargo, **esta API no existe en ningún lugar del repositorio**.
    Actualmente, `ReplicationSystem.ts` duplica y hardcodea la física del empuje de la nave directamente en su método `update` y en su método `reconcile`:
    ```typescript
    const power = 150;
    const ax = Math.cos(transform.rotation) * power;
    const ay = Math.sin(transform.rotation) * power;
    w.mutateComponent(entity, "Velocity", (v) => {
        v.vx += ax * (deltaTime / 1000);
        v.vy += ay * (deltaTime / 1000);
    });
    ```
*   **Impacto:**
    Si `AsteroidInputSystem` implementa su propio cálculo de empuje y rotación usando valores de configuración de `asteroids.json`, se producirá una divergencia inmediata con la predicción del lado del cliente realizada por `ReplicationSystem.ts`, causando "jittering" constante en modo multijugador debido a que la reconciliación utilizará fórmulas y valores fijos distintos.
*   **Corrección propuesta:**
    Crear una utilidad compartida de físicas o unificar los parámetros de física de la nave (fricción, velocidad de rotación, empuje) de manera que tanto `ReplicationSystem.ts` como `AsteroidInputSystem` utilicen exactamente los mismos coeficientes y fórmulas de integración (Euler semi-implícito).

### 4. Fragmentación de Asteroides inexistente
*   **Discrepancia:**
    No existe ninguna utilidad, clase o método en el repositorio para gestionar de forma genérica la fragmentación de asteroides.
*   **Impacto:**
    Toda la lógica de fragmentación (tamaño grande -> 2 medianos -> 2 pequeños) debe ser implementada manualmente dentro de la resolución de colisiones o en una utilidad de fábrica dedicada.
*   **Corrección propuesta:**
    Definir en `EntityFactory.ts` o en un módulo auxiliar la lógica para calcular direcciones perpendiculares basadas en la velocidad del asteroide padre, utilizando `world.gameplayRandom` para determinar el ángulo exacto de dispersión con un impulso radial determinista.

### 5. Incompatibilidad de GameState con Pong
*   **Archivos implicados:**
    *   `packages/core/src/games/pong/systems/PongGameStateSystem.ts`
    *   `packages/core/src/games/asteroids/systems/AsteroidGameStateSystem.ts`
*   **Discrepancia:**
    El sistema de estado de Pong es completamente incompatible con Asteroids. Pong maneja un estado con `scoreP1` y `scoreP2` y evalúa el fin de juego comparando con un puntaje máximo (`WIN_SCORE`).
    Asteroids debe gestionar un único puntaje de supervivencia, oleadas progresivas (`level`), vidas iniciales decrementales (`lives`) y un estado final cuando `lives <= 0`.
*   **Corrección propuesta:**
    `AsteroidGameStateSystem` debe ser desarrollado de forma independiente extendiendo `BaseGameStateSystem` y gestionando de manera aislada el ciclo de vidas, oleadas de asteroides y respawn de la nave.

---

## APIs verificadas

Esta sección detalla de forma rigurosa la disponibilidad de APIs asumidas y su estado real:

| API Asumida | Estado | Firma Real confirmada en el Código | Archivo |
| :--- | :--- | :--- | :--- |
| `EntityFactory.createShip` | ✅ Existe | `createShip(config: { world, x, y }): number` | `EntityFactory.ts` |
| `EntityFactory.createAsteroid` | ✅ Existe | `createAsteroid(config: { world, x, y, size }): number` | `EntityFactory.ts` |
| `EntityFactory.createBullet` | ❌ **No existe** | Debe ser implementada. | `EntityFactory.ts` |
| `matchPair` | ⚠ Local | Private helper en `PongCollisionSystem`. No disponible de manera global. | `PongCollisionSystem.ts` |
| `world.getSingleton` | ✅ Existe | `getSingleton(type: K): TComponents[K] \| undefined` | `World.ts` |
| `world.mutateSingleton` | ✅ Existe | `mutateSingleton(type: K, mutator: (component: TComponents[K]) => void): void` | `World.ts` |
| `world.query` | ✅ Existe | `query(...componentTypes: K[]): ReadonlyArray<Entity>` | `World.ts` |
| `world.mutateComponent` | ✅ Existe | `mutateComponent(entity, type, updater): boolean` | `World.ts` |
| `eventBus.emitDeferred` | ✅ Existe | `emitDeferred(event, payload): void` | `EventBus.ts` |
| `eventBus.emit` | ✅ Existe | `emit(event, payload): void` | `EventBus.ts` |

---

## Riesgos

Se han identificado los siguientes riesgos de implementación:

1.  **Desincronización de predicción cliente-servidor (Jitter):** Si las constantes físicas utilizadas por `ReplicationSystem` (`power = 150`, fricción, etc.) difieren de las constantes aplicadas por `AsteroidInputSystem` o la configuración del servidor, la reconciliación de predicción fallará en cada tick, causando saltos visuales severos de la nave local.
2.  **Modificaciones estructurales inválidas en caliente:** Eliminar balas o asteroides de forma inmediata mediante `world.removeEntity()` en medio del recorrido de bucles de colisiones puede causar inconsistencias graves o excepciones por punteros nulos. Es obligatorio usar comandos diferidos a través de `world.commands.removeEntity(entity)`.
3.  **Destrucción múltiple por una sola bala:** Si una bala colisiona con dos asteroides solapados en el mismo tick de física, podría desencadenar la destrucción de ambos antes de que la bala sea efectivamente eliminada del mundo. Es crítico verificar la existencia y validez de la bala en cada colisión procesada.
4.  **Consumo de `gameplayRandom` en la capa visual (Render):** Si algún sistema o componente visual consume `gameplayRandom` para efectos estéticos (como partículas o shakes), se corromperá el orden determinista de la semilla pseudoaleatoria, invalidando la replicación exacta. El renderizado y feedback visual deben consumir exclusivamente `world.renderRandom`.

---

## Decisiones pendientes

Para garantizar el éxito de la implementación, el equipo de desarrollo debe tomar las siguientes decisiones de diseño técnico:

1.  **Estrategia de unificación del cálculo físico de la nave:**
    *   *Opción A:* Refactorizar `ReplicationSystem.ts` para que extraiga la potencia de empuje (`power`), la fricción y la rotación desde un recurso o componente compartido, eliminando los valores hardcodeados de `150`.
    *   *Opción B:* Heredar directamente la lógica física de la nave desde una clase de utilidad común que sea invocada tanto por `AsteroidInputSystem` como por `ReplicationSystem`.
2.  **Manejo de Invulnerabilidad temporal en Respawn:**
    Definir si tras el respawn de la nave se le dotará de un estado de invulnerabilidad temporal y cómo se representará (p. ej., utilizando un temporizador en el componente `Health` o deshabilitando temporalmente su colisionador).
3.  **Unificación de Inputs:**
    Confirmar si se opta por que `setInputState()` escriba directamente sobre el componente unificado `"Input"` en modo singleplayer, eliminando el uso de `"InputState"` para la lógica de gameplay de Asteroids.

---

## Recomendación antes de implementar

Para mitigar todos los riesgos e inconsistencias detectadas, se recomienda seguir estrictamente este orden de ejecución:

1.  **Unificar el puente de Inputs:** Modificar `setInputState` en `AsteroidsGame.ts` para que en singleplayer también mapee y transmita las acciones (incluyendo `hyperspace`) directamente en el componente unificado `"Input"` de la entidad `LocalPlayer`. Esto permite que toda la simulación (físicas, disparo, hiperspacio, etc.) funcione con una única API unificada de entrada tanto en monojugador como en multijugador.
2.  **Unificar constantes de simulación de naves:** Parametrizar la aceleración, fricción y rotación dentro de la configuración compartida `AsteroidConfig` cargada en el world (`"GameConfig"`), y hacer que el sistema de replicación lea dichos parámetros en lugar de utilizar valores fijos e independientes.
3.  **Implementar `EntityFactory.createBullet` cumpliendo el contrato real de componentes:** Asegurar que se inicializan campos requeridos de `Transform`, `Velocity`, `Render`, `Bullet` y `"TTL"`, asegurando que para `"TTL"` se use el campo `remaining` de forma precisa para interactuar correctamente con `TTLSystem`.
4.  **Desarrollar el sistema de resolución de colisiones con doble seguridad:** Filtrar pares con `entityA < entityB` y verificar la existencia de las entidades mediante `world.hasEntity()` antes de procesar cada colisión individualmente.

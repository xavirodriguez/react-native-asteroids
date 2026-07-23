# Asteroids Investigation Report

Este informe presenta los resultados de una investigación técnica exhaustiva del repositorio para verificar la implementación real de los sistemas y asegurar la compatibilidad absoluta con el motor ECS y el flujo multijugador antes de continuar con el desarrollo de Asteroids.

---

## ✅ Confirmado

Basándonos en la inspección directa del código fuente, confirmamos las siguientes verdades y APIs del sistema:

### 1. TTLSystem
*   **Archivo:** `packages/core/src/systems/TTLSystem.ts`
*   **Nombre del componente:** `"TTL"` (`TTLComponent`, definido en `packages/core/src/ecs/CoreComponents.ts`).
*   **Propiedades requeridas:**
    *   `remaining: number`: El tiempo restante (en segundos para Asteroids, ver sección Discrepancias).
    *   `timeLeft: number`: Almacenado en el componente pero no modificado activamente por el sistema en su update.
    *   `onCompleteEvent?: string`: Nombre de evento opcional a emitir cuando expira el TTL.
*   **Comportamiento de eliminación:**
    Cuando `remaining <= 0`, el sistema:
    1.  Emite el evento diferido `onCompleteEvent` (si existe) mediante `world.getEventBus().emitDeferred()`.
    2.  Si la entidad contiene un componente `"Reclaimable"`, la devuelve a su respectivo pool usando `pool.release(entity)`.
    3.  Llama a `world.getCommandBuffer().removeEntity(entity)` para su eliminación diferida.

### 2. EntityFactory.createBullet()
*   **Archivo:** `packages/core/src/games/asteroids/EntityFactory.ts`
*   **Firma real:**
    ```typescript
    export function createBullet(
      worldOrConfig: World<AsteroidsComponentRegistry, AsteroidsEventRegistry> | {
        world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
        x: number;
        y: number;
        vx?: number;
        vy?: number;
        rotation?: number;
        speed?: number;
        ownerId?: string;
        ttl?: number;
      },
      x?: number,
      y?: number,
      rotation?: number,
      speed?: number,
      ownerId?: string,
      ttl?: number
    ): number
    ```
*   **Componentes integrados:**
    *   `Transform`: Inicializado con coordenadas `x`, `y` y `rotation` reales, `scaleX: 1`, `scaleY: 1`, `dirty: true`.
    *   `Velocity`: Inicializado con `vx`, `vy` calculados en base a la rotación y velocidad de disparo, `angularVelocity: 0`.
    *   `Render`: `visible: true`, `opacity: 1`, `order: 2`, `rotation: rotVal`, `angularVelocity: 0`, `hitFlashFrames: 0`.
    *   `Bullet`: Proporciona `{ type: "Bullet", ownerId }`.
    *   `TTL`: `{ type: "TTL", remaining: life, timeLeft: life }`.
    *   `Collider`: `shape: { type: ShapeType.Circle, radius: 2 }`, `layer: CollisionLayers.PROJECTILE`, `mask: CollisionLayers.ENEMY`.
    *   `CollisionEvents`: Lista vacía para acumular colisiones.
*   **Patrón:** Sigue exactamente el patrón diferido mediante `createBaseEntity` (que verifica `world.isUpdating` y encola la creación si es verdadero), consistente con `createShip` y `createAsteroid`.

### 3. EventBus y Emisión Diferida
*   **Archivo:** `packages/core/src/events/EventBus.ts`
*   **Métodos:**
    *   `emit()`: Sincrónico e inmediato. No debe usarse dentro de sistemas de colisiones o físicas porque muta componentes durante la iteración del loop.
    *   `emitDeferred()`: Inserta el evento en un buffer temporal (`primaryBuffer`) que se procesa al final del frame a través de `flushDeferred()`.
*   **Uso en Asteroids:** `AsteroidCollisionSystem` utiliza correctamente `emitDeferred` para emitir `"asteroid:destroyed"`, `"ship:destroyed"`, y `"score:changed"`.

### 4. Random determinista
*   **Archivo:** `packages/core/src/ecs/World.ts`
*   **Estado:** No existe ninguna llamada a `Math.random` dentro de la simulación de Asteroids (`packages/core/src/games/asteroids/`).
*   **APIs Deterministas:** Se utiliza exclusivamente `world.gameplayRandom` (instancia de `RandomService`) con los métodos `next()` y `nextRange()`, que soportan replays y predicción idénticos.

---

## ⚠ Discrepancias encontradas

Se identificaron las siguientes discrepancias técnicas críticas entre el código real del repositorio y el plan teórico asumido:

### 1. Fuente de verdad del Input (Unified Input vs Touch Direct Bridge)
*   **Archivos:** `src/app/asteroids/index.tsx`, `packages/core/src/games/asteroids/AsteroidsGame.ts`, `packages/core/src/games/asteroids/systems/AsteroidInputSystem.ts`
*   **Descripción:**
    *   El componente React (`index.tsx`) llama tanto a `handleInput(input)` (que mapea hacia `UnifiedInputSystem` del motor base) como a `game?.setInputState(input)` (el puente directo al componente `"Input"` de la entidad).
    *   `AsteroidInputSystem.ts` lee directamente el componente `"Input"` de la entidad del jugador, ignorando por completo los overrides del `UnifiedInputSystem`.
    *   El teclado del hook `useGame.ts` escribe únicamente en el `UnifiedInputSystem` mediante `setOverride()`.
*   **Impacto:**
    La simulación en monojugador funciona para controles táctiles porque llaman explícitamente a `setInputState()`, pero los controles por teclado en web no se propagan automáticamente al componente `"Input"`, impidiendo jugar con teclado a menos que se unifiquen las entradas.
*   **Corrección propuesta:**
    Unificar la lógica en `AsteroidsGame.ts` para que, al inicio de la actualización o mediante un sistema de pre-update de inputs, se transfieran los estados activos en `UnifiedInputSystem` al componente unificado `"Input"` del jugador local.

### 2. Duplicación e Incoherencia Física en `ReplicationSystem`
*   **Archivos:** `packages/core/src/network/ReplicationSystem.ts`, `packages/core/src/games/asteroids/utils/AsteroidPhysics.ts`
*   **Descripción:**
    *   `AsteroidPhysics.ts` expone la función unificada `computeShipPhysics()` que procesa rotación, empuje (`SHIP_THRUST`) y fricción (`SHIP_FRICTION`) con Euler semi-implícito.
    *   Sin embargo, `ReplicationSystem.ts` (en `update` y `reconcile`) **no utiliza `computeShipPhysics`**. Duplica y hardcodea un cálculo de empuje simplificado con valores constantes (`SHIP_THRUST = 150` hardcodeado en la simulación local, ignorando fricciones y velocidades rotacionales de la configuración).
*   **Impacto:**
    Durante el juego multijugador, la predicción local en el cliente y la reconciliación simularán la velocidad de la nave de forma diferente al servidor (que usa `AsteroidInputSystem` con la fricción y rotación de `computeShipPhysics`). Esto produce desincronizaciones constantes de posición (jittering violento).
*   **Corrección propuesta:**
    Refactorizar `ReplicationSystem.ts` para que importe y llame a `computeShipPhysics()` con las propiedades físicas reales del jugador, eliminando la lógica de empuje duplicada y estática.

### 3. El Bug de Fragmentación de Asteroides Inactiva
*   **Archivos:** `packages/core/src/games/asteroids/systems/AsteroidCollisionSystem.ts`, `packages/core/src/games/asteroids/EntityFactory.ts`
*   **Descripción:**
    *   `EntityFactory.ts` implementa perfectamente la función determinista `fragmentAsteroid()`.
    *   Sin embargo, `AsteroidCollisionSystem.ts` **nunca llama a `fragmentAsteroid`** en su bloque de resolución de colisiones entre balas y asteroides. Simplemente elimina la bala y el asteroide padre del mundo.
*   **Impacto:**
    Los asteroides destruidos por disparos desaparecen por completo en lugar de dividirse en fragmentos de menor tamaño, rompiendo la jugabilidad core de Asteroids. El test de integración `should resolve bullet and asteroid collisions` pasa porque solo asume la eliminación del padre, pero no verifica que los hijos se hayan generado.
*   **Corrección propuesta:**
    Añadir la llamada a `fragmentAsteroid(world, asteroid)` dentro de `AsteroidCollisionSystem.ts` antes de que la entidad del asteroide padre sea eliminada a través del CommandBuffer.

### 4. El Bug Crítico de Entrada en Multiplayer (Hyperspace & Shoot reset)
*   **Archivos:** `packages/react-native/src/hooks/useMultiplayer.ts`, `src/app/asteroids/index.tsx`
*   **Descripción:**
    *   Cuando el jugador presiona botones discretos como Hiperspacio o Disparo, `index.tsx` llama a `handleMultiplayerInput({ hyperspace: true })`.
    *   La función `sendInput` en `useMultiplayer.ts` recibe este objeto parcial `{ hyperspace: true }` y construye un `InputFrame`.
    *   Al construir el frame, evalúa todas las propiedades ausentes (como `thrust`, `rotateLeft`) como falsas:
        ```typescript
        const actions: string[] = [];
        if (input.thrust) actions.push("thrust");
        ...
        ```
*   **Impacto:**
    Si estás acelerando (thrust = true) and presionas disparar o hiperspacio, la aceleración y las rotaciones se cancelan instantáneamente en el servidor y en la predicción local, porque el frame de red enviado carece de las propiedades de movimiento previas.
*   **Corrección propuesta:**
    Hacer que la función `sendInput` acumule y mantenga el estado de entrada persistente en lugar de procesar los inputs parciales de forma aislada, o que el componente de UI mantenga el estado total acumulado de las entradas.

---

## APIs verificadas

Auditoría detallada de las APIs consumidas en el gameplay de Asteroids:

| API Utilizada | Estado Real | Comportamiento / Firma Confirmada |
| :--- | :--- | :--- |
| `world.mutateSingleton` | ✅ Existe | `mutateSingleton(type, mutator)` modifica en su lugar el singleton correspondiente en el ECS. |
| `world.getSingleton` | ✅ Existe | `getSingleton(type)` retorna el componente singleton guardado en el mundo. |
| `world.getCommandBuffer` | ✅ Existe | `getCommandBuffer()` entrega el buffer para registrar operaciones estructurales en cola. |
| `eventBus.emitDeferred` | ✅ Existe | `emitDeferred(event, payload)` encola el evento de forma segura. |
| `EntityFactory.createShip` | ✅ Existe | `createShip({ world, x, y })` crea la nave del jugador con componentes por defecto. |
| `EntityFactory.createBullet` | ✅ Existe | `createBullet(config)` inicializa un proyectil con TTL y Collider circular de radio 2. |
| `EntityFactory.fragmentAsteroid` | ✅ Existe | `fragmentAsteroid(world, parentAsteroid)` divide el asteroide en fragmentos pequeños. |
| `matchPair` | ❌ **No existe** | No existe de forma global. `AsteroidCollisionSystem` realiza la identificación de colisiones usando condicionales booleanos inline. |

---

## Riesgos

1.  **Divergencia de Físicas en Multiplayer:** El desfase entre `ReplicationSystem` y `AsteroidInputSystem` causará que las naves locales se desvíen de la posición autoritativa del servidor en cada resimulación, frustrando a los jugadores.
2.  **Unidades de Tiempo en TTLSystem:** En SpaceInvaders se configuró una entidad popup con TTL `{ timeLeft: 1000, remaining: 1000 }` (esperando milisegundos), pero el loop del juego pasa `deltaTime` en segundos. Esto indica que SpaceInvaders tiene un bug latente donde los popups tardan 1000 segundos en expirar. En Asteroids, el TTL de las balas se inicializa correctamente con `2.0` (segundos), coincidiendo con la actualización en segundos del loop de simulación. Es crítico no mezclar milisegundos con segundos.
3.  **Doble resolución de colisiones (Crashes):** Si una bala choca con dos asteroides solapados en el mismo tick, intentar fragmentar o eliminar la bala dos veces puede causar un crash si no se valida su existencia mediante un Set de entidades destruidas (`destroyedEntities`).

---

## Decisiones pendientes

1.  **Estrategia de unificación de inputs en React Native:** Decidir si `index.tsx` o `AsteroidsGame` deben unificar la acumulación de entradas de movimiento continuas (Joystick) y discretas (Disparo/Hiperspacio) para evitar que se pisen mutuamente al enviarse al servidor.
2.  **Uso de `computeShipPhysics` en `ReplicationSystem`:** Es de carácter prioritario refactorizar `ReplicationSystem.ts` para que use `computeShipPhysics` eliminando la duplicación física y sincronizando la predicción de red.

---

## Recomendación antes de implementar

Antes de iniciar la codificación final de las fases de Asteroids:

1.  **Corregir la desincronización de `ReplicationSystem`:** Asegurarse de que toda la predicción local en multijugador y reconciliación consuma `computeShipPhysics` con los parámetros correspondientes de la nave (`SHIP_THRUST`, `SHIP_FRICTION`, `SHIP_ROTATION_SPEED`).
2.  **Corregir el flujo de inputs de red en `useMultiplayer`:** Almacenar de forma persistente los inputs en el cliente multijugador antes de construir el `InputFrame`, asegurando que acciones discretas como `shoot: true` no sobreescriban y limpien `thrust` u otras rotaciones activas.
3.  **Conectar `fragmentAsteroid` en el Collision System:** Activar el método `fragmentAsteroid(world, asteroid)` en `AsteroidCollisionSystem.ts` antes de destruir el asteroide colisionado por proyectiles.

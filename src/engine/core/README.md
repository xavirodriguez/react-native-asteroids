# TinyAsterEngine Core (ECS)

El núcleo del motor está basado en una arquitectura **Entity-Component-System (ECS)** diseñada para alto rendimiento, determinismo y facilidad de sincronización en red.

## 🏗️ Bloques Fundamentales

### 1. World
El registro central. Almacena todas las entidades y componentes. Gestiona el ciclo de vida y proporciona las `Queries` para que los sistemas accedan a los datos.
*   **Versionado**: Mantiene `structureVersion` (cambios en entidades) y `stateVersion` (cambios en datos de componentes) con la intención de optimizar el renderizado y la red.

### 2. Entity
Un simple identificador numérico único. Las entidades no contienen lógica; actúan como claves para asociar componentes.

### 3. Component
Estructuras de datos (POJOs). Representan el estado (posición, salud, velocidad).
*   **Recomendación**: Se sugiere que no contengan funciones ni lógica compleja para facilitar la serialización (`World.snapshot()`).

### 4. System
Contiene la lógica de ejecución. Los sistemas iteran sobre grupos de entidades (filtradas por componentes) y mutan su estado.
*   **Pipeline**: Los sistemas se ejecutan en fases predefinidas (Input, Simulation, Collision, Presentation).

## 🔄 El Bucle de Juego (GameLoop)

El motor utiliza un esquema de **Fixed Timestep / Variable Rendering**:
1.  **Update (Lógica)**: Se orienta a una frecuencia fija (60Hz). Diseñado para favorecer la consistencia en la física y las reglas de juego.
2.  **Render (Presentación)**: Se ejecuta según el refresco del hardware. Utiliza un factor de interpolación (`alpha`) con la intención de suavizar el movimiento visual entre ticks físicos.

## 🛡️ Prácticas Recomendadas

1.  **Mutación Autorizada**: Se recomienda utilizar `world.mutateComponent()` o `world.mutateSingleton()` como el método principal para modificar datos. Esto permite que el motor rastree cambios de versión y gestione el estado de renderizado.
2.  **Seguridad de Iteradores**: Durante el `update` de un sistema, los cambios estructurales (crear/destruir entidades o añadir/quitar componentes) deben diferirse a través del `WorldCommandBuffer`. Esto evita inconsistencias al iterar sobre queries activas.
3.  **Consistencia de Simulación**: Para favorecer la reproducibilidad, se debe evitar el uso de fuentes de tiempo o aleatoriedad externas (como `Math.random()` o `Date.now()`) dentro de los Sistemas. En su lugar, utilice `world.gameplayRandom` y `world.tick`.

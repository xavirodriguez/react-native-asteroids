# TinyAsterEngine Core (ECS)

El núcleo del motor está basado en una arquitectura **Entity-Component-System (ECS)** diseñada para alto rendimiento, determinismo y facilidad de sincronización en red.

## 🏗️ Bloques Fundamentales

### 1. World
El registro central. Almacena todas las entidades y componentes. Gestiona el ciclo de vida y proporciona las `Queries` para que los sistemas accedan a los datos.
*   **Versionado**: Mantiene `structureVersion` (cambios en entidades) y `stateVersion` (cambios en datos de componentes) para optimizar el renderizado y la red.

### 2. Entity
Un simple identificador numérico único. Las entidades no contienen lógica; son solo "percheros" para colgar componentes.

### 3. Component
Estructuras de datos puras (POJOs). Representan el estado (posición, salud, velocidad).
*   **Invariante**: No deben contener funciones ni lógica compleja para facilitar la serialización (`World.snapshot()`).

### 4. System
Contiene la lógica de ejecución. Los sistemas iteran sobre grupos de entidades (filtradas por componentes) y mutan su estado.
*   **Pipeline**: Los sistemas se ejecutan en fases predefinidas (Input, Simulation, Collision, Presentation).

## 🔄 El Bucle de Juego (GameLoop)

El motor utiliza un esquema de **Fixed Timestep / Variable Rendering**:
1.  **Update (Lógica)**: Se ejecuta a una frecuencia fija (60Hz). Garantiza que la física y las reglas de juego sean deterministas.
2.  **Render (Presentación)**: Se ejecuta tan rápido como permita el hardware. Utiliza un factor de interpolación (`alpha`) para suavizar el movimiento visual entre dos ticks físicos.

## 🛡️ Invariantes y Reglas de Oro

1.  **No mutar directamente**: Usa siempre `world.mutateComponent` o `world.mutateSingleton` para asegurar que el sistema de versionado detecte los cambios.
2.  **Diferir cambios estructurales**: Durante un `update` de sistema, usa el `WorldCommandBuffer` para crear o destruir entidades. Esto evita corromper los iteradores de las queries en curso.
3.  **Determinismo**: Nunca uses `Math.random()` o `Date.now()` dentro de un Sistema. Usa el `RandomService` y el `world.tick`.

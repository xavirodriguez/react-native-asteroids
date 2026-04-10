# Hotspots de Rendimiento y Optimización

## Gestión de Memoria

### 1. Entity y Component Pooling
Para evitar el coste de creación de objetos y la presión del Garbage Collector (GC) en juegos de alta intensidad (como Asteroids con miles de partículas), el motor utiliza:
- **`EntityPool`**: Recicla IDs numéricos.
- **`PrefabPool`**: Permite pre-instanciar entidades complejas (con múltiples componentes) y activarlas/desactivarlas mediante una marca de "activo" o eliminándolas del World, devolviéndolas al pool.

### 2. Query Caching
Las consultas a entidades (`world.query`) son una de las operaciones más frecuentes.
- Los resultados se cachean internamente.
- La caché solo se invalida si cambia la firma estructural del World (`world.version`).
- **Optimización de búsqueda**: El motor siempre comienza a filtrar por el tipo de componente que menos entidades poseen en ese momento.

## Throttling de la UI (React Native Bridge)
El bridge entre JavaScript y los componentes nativos de React Native es un cuello de botella conocido.
- **Throttling a 15 FPS**: El hook `useGame` limita la actualización del estado de React a 15 veces por segundo, independientemente de que el motor corra a 60 FPS.
- **Renderizado Directo**: Las capas de juego (Canvas/Skia) corren en su propio loop de `requestAnimationFrame`, comunicándose con el motor sin pasar por el sistema de reconciliación de React.

## Hot Paths a Vigilar

| Hot Path | Riesgo | Mitigación |
|----------|--------|------------|
| **Broadphase de Colisiones** | Complejidad O(N²) | Uso de `SpatialHash` para reducir comprobaciones. |
| **Integración Física** | Cálculos trigonométricos masivos | Pre-cálculo de tablas de senos/cosenos si fuera necesario (actualmente dinámico). |
| **Reconstrucción de Render Commands** | Presión de GC | El `CanvasRenderer` reconstruye el array de comandos cada frame. Para optimizar, se deben usar backends más eficientes como Skia. |
| **Serialización de Red** | Latencia y ancho de banda | Uso de deltas (patches) en lugar de enviar el estado completo. |
| **Hierarchy Resolution** | Árboles profundos | El `HierarchySystem` utiliza una caché de procesamiento para evitar re-calcular nodos ya visitados en el frame actual. |

## Diagnóstico
El motor incluye un **`SystemProfiler`** (activable vía `world.debugMode = true`) que registra el tiempo promedio de ejecución de cada sistema individual, permitiendo localizar rápidamente qué sistema está consumiendo el presupuesto de tiempo del frame.

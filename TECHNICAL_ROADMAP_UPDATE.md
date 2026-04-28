## 🔍 Cuello de botella actual

**Sobrecarga de Comunicación y Sincronización en Red (Network Jitter & Bandwidth).**

Tras optimizar la simulación mediante **Unified Spatial Simulation Culling (USSC)**, el motor es capaz de procesar miles de entidades localmente. Sin embargo, en entornos multijugador, el envío del estado completo del mundo (`WorldSnapshot`) por cada tick es insostenible. La falta de un sistema de **Snapshot Delta** y **Entity Interest Management** satura el ancho de banda y provoca latencia perceptible (jitter) incluso con un número moderado de entidades activas.

## 🛠️ Solución propuesta (FASE: ESCALABILIDAD Y RED)

1.  **Unified Spatial Simulation Culling (USSC) [IMPLEMENTADO]**: Integración de `SpatialGrid` como recurso global y `SpatialPartitioningSystem`. Los sistemas de física y partículas ahora son proporcionales al área visible, permitiendo densidades masivas de entidades.
2.  **Snapshot Delta Compression**: Implementación de un sistema de serialización diferencial que solo envíe los componentes mutados (detectados vía `stateVersion`) en lugar de snapshots completos.
3.  **Interest Management Espacial**: Utilizar el `SpatialGrid` para filtrar qué entidades se envían a cada cliente, basándose en su proximidad espacial, reduciendo drásticamente el tráfico de red innecesario.

## ⚙️ Diseño técnico (Próximo Hito)

-   **Componentes**:
    -   `NetworkReplicationComponent`: Marca qué propiedades deben sincronizarse y su prioridad.
-   **Sistemas**:
    -   `NetworkDeltaSystem`: Compara el estado actual con el último ACK del cliente y genera un paquete de cambios (diff).
    -   `InterestManagerSystem`: Consulta el `SpatialGrid` para calcular el conjunto de entidades relevantes para cada socket de jugador.

## 🎮 Impacto en el juego

-   **Rendimiento Local**: La CPU se libera de procesar lógica invisible, manteniendo 60 FPS estables incluso con miles de asteroides/partículas en el "universo" extendido.
-   **Experiencia Online**: Reducción del uso de banda de ~80%, permitiendo partidas con más jugadores y proyectiles sin lag.
-   **Game Feel**: La consistencia entre lo que se simula y lo que se ve mejora gracias a la reducción de paquetes perdidos o retrasados.

## 🚀 Qué desbloquea después

**IA de Enjambre (Swarm AI) de Larga Distancia.**

Con una red eficiente y simulación culleada, el motor podrá gestionar naves enemigas con comportamientos complejos que operan en "sectores" distantes del mundo, permitiendo un diseño de niveles abierto y persistente.

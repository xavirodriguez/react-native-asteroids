# Technical Roadmap — react-native-asteroids

## NEXT_PRIORITY
Nombre del objetivo: Visualizador e Interfaz Gráfica para Métricas de Telemetría (Dashboard)
Descripción: Crear un panel de control o dashboard en la interfaz de usuario que consuma y visualice en tiempo real las métricas expuestas (GC pause rate, compresión SoA vs AoS, uso de memoria, latencia de red) para facilitar la depuración de rendimiento.
Criterios de aceptación:
- [ ] Diseñar un panel o componente de UI para renderizar las métricas.
- [ ] Realizar solicitudes periódicas o recibir actualizaciones por red del endpoint/handler de Colyseus.
- [ ] Renderizar gráficos simples o indicadores visuales (latencia de red, GC pause ms, ratio de compresión SoA vs AoS).

## Objetivos completados
- [x] Monitoreo Avanzado de Rendimiento de Red y Garbage Collection: Implementación de telemetría detallada para medir el GC pause rate, estadísticas de compresión SoA vs AoS y exposición de métricas de red mediante Colyseus.
- [x] PR #297: Framework de Power-ups, Semantic Audio Bridge, disciplina mutateComponent
- [x] Spatial Culling para Simulación: Optimización del rendimiento en alta densidad de entidades mediante descartado dinámico fuera de viewport en bucles físicos y de colisiones.
- [x] Estructura de Arrays (SoA) para Snapshots: Diseño, prototipado e integración del formato de snapshots optimizado con TypedArrays para alta velocidad de réplica y reducción de impacto de GC.
- [x] Compresión de Red binaria para Snapshots SoA: Optimización de la capa de transporte de red para empaquetar y transmitir directamente los buffers binarios (`ArrayBuffer` / `TypedArray`) de los Snapshots SoA, eliminando la serialización intermedia JSON.

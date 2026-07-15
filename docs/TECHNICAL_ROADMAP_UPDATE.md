# Technical Roadmap — react-native-asteroids

## NEXT_PRIORITY
Nombre del objetivo: Monitoreo Avanzado de Rendimiento de Red y Garbage Collection
Descripción: Implementar telemetría e instrumentación detallada para analizar el impacto en la alocación de memoria del GC y la latencia utilizando el nuevo pipeline de snapshots binarios SoA.
Criterios de aceptación:
- [ ] Instrumentar el bucle de actualización en AsteroidsRoom para medir el GC pause rate.
- [ ] Recolectar estadísticas detalladas de compresión SoA vs AoS.
- [ ] Exponer métricas de red mediante el endpoint de Colyseus.

## Objetivos completados
- [x] PR #297: Framework de Power-ups, Semantic Audio Bridge, disciplina mutateComponent
- [x] Spatial Culling para Simulación: Optimización del rendimiento en alta densidad de entidades mediante descartado dinámico fuera de viewport en bucles físicos y de colisiones.
- [x] Estructura de Arrays (SoA) para Snapshots: Diseño, prototipado e integración del formato de snapshots optimizado con TypedArrays para alta velocidad de réplica y reducción de impacto de GC.
- [x] Compresión de Red binaria para Snapshots SoA: Optimización de la capa de transporte de red para empaquetar y transmitir directamente los buffers binarios (`ArrayBuffer` / `TypedArray`) de los Snapshots SoA, eliminando la serialización intermedia JSON.

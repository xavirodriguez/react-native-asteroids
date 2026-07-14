# Technical Roadmap — react-native-asteroids

## NEXT_PRIORITY
Nombre del objetivo: Compresión de Red binaria para Snapshots SoA
Descripción: Optimizar la capa de transporte de red para empaquetar y transmitir directamente los búferes binarios (`ArrayBuffer` / `TypedArray`) de los Snapshots SoA, eliminando la serialización intermedia a cadenas de texto JSON y reduciendo la latencia de red y el ancho de banda.
Criterios de aceptación:
- [ ] Investigar el formato de serialización binaria para `SoAComponentTypeData`
- [ ] Prototipar un codificador/decodificador binario compacto para snapshots SoA
- [ ] Integrar el codificador de red binario en el transport de Colyseus
- [ ] Validar el determinismo de la réplica multijugador con suites de tests integrados

## Objetivos completados
- [x] PR #297: Framework de Power-ups, Semantic Audio Bridge, disciplina mutateComponent
- [x] Spatial Culling para Simulación: Optimización del rendimiento en alta densidad de entidades mediante descartado dinámico fuera de viewport en bucles físicos y de colisiones.
- [x] Estructura de Arrays (SoA) para Snapshots: Diseño, prototipado e integración del formato de snapshots optimizado con TypedArrays para alta velocidad de réplica y reducción de impacto de GC.

# Technical Roadmap — react-native-asteroids

## NEXT_PRIORITY
Nombre del objetivo: Estructura de Arrays (SoA) para Snapshots
Descripción: Investigar y prototipar la migración de las estructuras de snapshots del mundo ECS a un diseño SoA (Structure of Arrays / TypedArrays) para reducir la presión sobre el recolector de basura (GC) y optimizar la copia de datos en red y simulaciones locales de física.
Criterios de aceptación:
- [ ] Analizar el impacto de GC de los snapshots actuales
- [ ] Prototipar almacenamiento SoA/TypedArrays en `WorldSnapshot`
- [ ] Mantener compatibilidad con rollback y replay determinista
- [ ] Validar con los tests de determinismo existentes

## Objetivos completados
- [x] PR #297: Framework de Power-ups, Semantic Audio Bridge, disciplina mutateComponent
- [x] Spatial Culling para Simulación: Optimización del rendimiento en alta densidad de entidades mediante descartado dinámico fuera de viewport en bucles físicos y de colisiones.

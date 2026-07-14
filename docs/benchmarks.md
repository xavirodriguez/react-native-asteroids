# Benchmark Cero (Baseline)

Este documento establece el "Benchmark Cero" para el ecosistema TinyAster antes de la migración masiva a `@tiny-aster/core`.
El objetivo es asegurar que la nueva arquitectura ECS no degrade el rendimiento en comparación con el código legacy de `src/engine/`.

## Métricas de Referencia (Estimadas)

| Juego | FPS Objetivo | Memoria JS (Est.) | Dispositivo de Prueba |
| :--- | :--- | :--- | :--- |
| Pong (Legacy) | 60 FPS | ~15-20 MB | Simulador iOS / Android |
| Asteroids (Legacy) | 60 FPS | ~25-30 MB | Simulador iOS / Android |

## Factores de Rendimiento

1. **JS Thread FPS**: Se espera mantener 60 FPS estables en juegos simples.
2. **GC Pressure**: La nueva arquitectura ECS utiliza pools de entidades e intenta minimizar la creación de objetos por frame para reducir las pausas del Garbage Collector.
3. **Bridge Traffic**: Al mover la lógica a `@tiny-aster/core` y usar renderizadores especializados (como Skia), se busca reducir la comunicación innecesaria a través del bridge de React Native.

## Procedimiento de Validación

Para cada juego migrado, se debe:
1. Ejecutar el juego en modo Release.
2. Monitorizar los FPS durante 60 segundos de juego continuo.
3. Comparar con los valores de referencia anteriores.
4. Documentar cualquier desviación significativa (> 10% de caída en FPS o > 20% de aumento en memoria).

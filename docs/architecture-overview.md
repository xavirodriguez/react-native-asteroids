# Visión General de la Arquitectura del Motor

Este documento proporciona una visión de alto nivel del diseño y la organización del motor de juego basado en ECS (Entity-Component-System) desarrollado para React Native y Expo.

## Filosofía del Motor

El motor está diseñado bajo los principios de **determinismo**, **desacoplamiento** y **rendimiento**. Se basa en una arquitectura ECS pura donde:
- **Entidades** son simples IDs numéricos.
- **Componentes** son POJOs con datos puros.
- **Sistemas** encapsulan la lógica y operan sobre conjuntos de componentes.

## Módulos Principales

El motor se organiza en los siguientes directorios dentro de `src/engine/`:

- `core/`: El núcleo del motor. Contiene el `World`, el `GameLoop`, el buffer de comandos (`WorldCommandBuffer`) y las interfaces base para `System` y `Component`.
- `systems/`: Sistemas generales proporcionados por el motor (Movimiento, Jerarquías, Animación, Partículas, etc.).
- `physics/`: Lógica de colisiones y dinámica 2D, incluyendo detección de fase ancha (Spatial Hash) y fase estrecha.
- `rendering/`: Backends de renderizado (Canvas, Skia) y arquitectura basada en snapshots.
- `input/`: Sistema de entrada unificado que mapea hardware a acciones semánticas.
- `utils/`: Utilidades críticas como `RandomService` (PRNG determinista) y `PhysicsUtils`.

## Flujo de Datos y Ejecución

El ciclo de vida del juego se gestiona a través de un **Fixed Timestep** de 60Hz. Cada frame sigue un pipeline estricto:

1. **Captura de Input**: Los eventos de hardware se normalizan en acciones semánticas.
2. **Pre-Simulación**: Se capturan snapshots de las transformaciones actuales (`InterpolationPrepSystem`) para permitir la interpolación visual posterior.
3. **Simulación (Update)**: Se ejecutan los sistemas registrados en fases secuenciales (Input, Simulation, Collision, GameRules, Presentation).
4. **Transformación Jerárquica**: El `HierarchySystem` propaga las coordenadas locales a coordenadas de mundo.
5. **Flush de Comandos**: Se aplican todos los cambios estructurales (creación/eliminación) diferidos durante el update.
6. **Renderizado**: El renderer consume un snapshot interpolado y dibuja la escena de forma independiente a la tasa de simulación.

## Integración con React Native

La integración se realiza mediante el hook `useGame`. Este hook actúa como puente, permitiendo que componentes de React controlen el motor (pausa, reinicio, entrada) y reaccionen a cambios de estado de forma optimizada (throttling).

## Principios de Determinismo

Para soportar multijugador y repeticiones (replays), el motor impone:
- Uso obligatorio de `RandomService.getInstance("gameplay")` para lógica de juego.
- Prohibición de `Math.random()` y `Date.now()` en sistemas de simulación.
- Pasos de tiempo fijos y consistentes para la física.

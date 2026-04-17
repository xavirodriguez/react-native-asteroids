# Visión General de la Arquitectura: TinyAsterEngine

## Propósito del Motor
TinyAsterEngine es un framework de videojuegos arcade 2D de alto rendimiento construido sobre una arquitectura **ECS (Entity-Component-System)** pura. Está diseñado para ser multiplataforma (iOS, Android, Web) utilizando **React Native y Expo**, permitiendo un desarrollo ágil con TypeScript.

Su filosofía se basa en el desacoplamiento total de la simulación y la representación visual, garantizando determinismo para aplicaciones multijugador y una alta tasa de fotogramas mediante optimizaciones de memoria (pooling y zero-allocation).

## Límites Engine vs. Game
El motor proporciona las primitivas necesarias para la simulación, mientras que el juego define la lógica específica.

### Responsabilidades del Engine (`src/engine/`)
- **Core**: Gestión del mundo ECS, entidades, componentes base y el loop de juego de tiempo fijo.
- **Sistemas Base**: Movimiento lineal, fricción, límites de pantalla (wrapping/bounce), TTL y jerarquías.
- **Rendering**: Abstracción de backends (Canvas, Skia) y pipeline de renderizado genérico.
- **Input**: Normalización de entradas de teclado y táctiles a acciones semánticas.
- **Networking**: Infraestructura para predicción, interpolación y reconciliación (basado en Colyseus).

### Responsabilidades del Juego (`src/games/`)
- **Registro de Sistemas**: Definición del orden de ejecución y sistemas específicos del juego.
- **Fábrica de Entidades**: Definición de prefabs (Ship, Asteroid, Bullet).
- **Visuales**: Registro de `ShapeDrawers` específicos y efectos de partículas.
- **Reglas de Juego**: Sistemas de puntuación, oleadas, niveles y condiciones de derrota.

## Módulos Principales
1. **ECS World (`core/World.ts`)**: Registro central y base de datos in-memory. Gestiona el ciclo de vida de entidades y el acceso reactivo mediante Queries.
2. **Game Loop (`core/GameLoop.ts`)**: Orquestador de tiempo que garantiza un timestep fijo de 60Hz para la simulación y variable para el renderizado.
3. **BaseGame (`core/BaseGame.ts`)**: Clase maestra que coordina la inicialización, el loop determinista y la integración con la UI de React Native.
4. **Unified Input (`input/UnifiedInputSystem.ts`)**: Normaliza entradas de hardware y permite inyecciones lógicas (overrides) para controles táctiles y red.
5. **Renderer Pipeline (`rendering/`)**: Pipeline desacoplado que utiliza snapshots e interpolación para una visualización fluida.
6. **Scene Manager (`scenes/SceneManager.ts`)**: FSM atómica para gestionar transiciones de estado de juego sin fugas de memoria.

## Principios Arquitectónicos
1. **ECS Puro**: Separación estricta de datos (Componentes) y lógica (Sistemas). Las entidades son simples identificadores numéricos.
2. **Simulación Determinista**: Timesteps fijos (16.67ms) y uso obligatorio de `RandomService` (PRNG) para asegurar que la lógica sea reproducible.
3. **Desacoplamiento Visual**: El motor de renderizado es un consumidor pasivo del estado del mundo, operando sobre transformaciones interpoladas.
4. **Single Source of Truth**: El `World` (o la `Scene` activa) es el único almacén de estado; React Native actúa solo como una capa de presentación y control.
5. **Zero Allocation (Hot Path)**: Uso intensivo de pools (`EntityPool`, `PrefabPool`, `CommandBuffer`) para minimizar la presión del GC durante el gameplay.

## API Reference
La documentación técnica detallada de cada clase, interfaz y sistema se genera automáticamente a partir del código fuente.

- [**Referencia de API Completa**](./api-reference/index.md)

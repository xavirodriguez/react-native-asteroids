# Visión General de la Arquitectura: TinyAsterEngine

## Propósito del Motor
TinyAsterEngine es un framework de videojuegos arcade 2D de alto rendimiento construido sobre una arquitectura **ECS (Entity-Component-System)** pura. Está diseñado para ser multiplataforma (iOS, Android, Web) utilizando **React Native y Expo**, permitiendo un desarrollo ágil con TypeScript.

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
1. **ECS World (`core/World.ts`)**: Base de datos in-memory de entidades y componentes.
2. **Game Loop (`core/GameLoop.ts`)**: Latido determinista a 60Hz.
3. **Unified Input (`input/UnifiedInputSystem.ts`)**: Capa de abstracción de hardware.
4. **Renderer Pipeline (`rendering/`)**: Sistema de dibujo extensible.

## Principios Arquitectónicos
1. **Composición sobre Herencia**: El comportamiento se define por qué componentes tiene una entidad, no por su clase.
2. **Simulación Determinista**: Uso de `RandomService` y timesteps fijos para garantizar resultados reproducibles.
3. **Unificación de Loop**: Los renderizadores son pasivos y sincronizados con el latido del motor.
4. **Local-First / Server-Authoritative**: Soporte nativo para predicción en cliente con validación en servidor.
5. **Zero Allocation Rendering**: Los renderizadores (Canvas, Skia) utilizan pools de comandos y snapshots para evitar la presión del GC durante el frame.
6. **Integridad de Singletons**: El motor garantiza que los componentes singleton sean mutables al recuperarlos (Principio 6).

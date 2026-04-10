# Visión General de la Arquitectura: TinyAsterEngine

## Propósito del Motor
TinyAsterEngine es un framework de videojuegos arcade 2D de alto rendimiento construido sobre una arquitectura **ECS (Entity-Component-System)** pura. Está diseñado para ser multiplataforma (iOS, Android, Web) utilizando **React Native y Expo**, permitiendo un desarrollo ágil con TypeScript. El motor se centra en el determinismo, el rendimiento y la extensibilidad mediante la composición de componentes.

## Límites Engine vs. Game
El motor proporciona las primitivas necesarias para la simulación, mientras que el juego define la lógica específica. Se sigue una separación clara para permitir que el core sea reutilizable entre múltiples títulos arcade.

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
1. **ECS World (`core/World.ts`)**: Base de datos in-memory de entidades y componentes con indexación reactiva.
2. **Game Loop (`core/GameLoop.ts`)**: Latido determinista a 60Hz con acumulador de tiempo para interpolación visual.
3. **Unified Input (`input/UnifiedInputSystem.ts`)**: Capa de abstracción que mapea hardware crudo a acciones semánticas.
4. **Renderer Pipeline (`rendering/`)**: Sistema de dibujo extensible con soporte para Canvas, Skia y SVG.
5. **Physics Utils (`utils/PhysicsUtils.ts`)**: Integradores matemáticos compartidos para garantizar paridad entre cliente y servidor.

## Principios Arquitectónicos
1. **Composición sobre Herencia**: El comportamiento se define por qué componentes tiene una entidad, no por su clase. Las entidades son solo IDs.
2. **Simulación Determinista**: Uso de `RandomService` segregado y timesteps fijos (60Hz) para garantizar resultados reproducibles y soporte de replay.
3. **Unificación de Loop**: Los renderizadores son pasivos y sincronizados con el latido del motor. No implementan su propio `requestAnimationFrame`.
4. **Local-First / Deterministic Lockstep**: Soporte nativo para sincronización multijugador mediante buffers de entrada y estados deterministas.
5. **Invariantes Fuertes**: Validación activa de jerarquías y tipos de datos en tiempo de desarrollo (Principio 2).

# Guía de Onboarding para Desarrolladores del Motor

Bienvenido al equipo de desarrollo de TinyAsterEngine. Esta guía te ayudará a navegar por la arquitectura del motor y a realizar tus primeras contribuciones de forma segura.

## 1. Mapa Mental de la Arquitectura

El motor se divide en tres capas principales:

1.  **Core ECS (`src/engine/core/`)**: Las primitivas de datos y el loop de tiempo.
2.  **Sistemas de Motor (`src/engine/systems/`)**: Comportamientos universales (Física, TTL, Jerarquías).
3.  **Backends de Renderizado (`src/engine/rendering/`)**: Cómo se dibujan los datos en pantalla.

## 2. Cómo Fluye un Frame

Cada tick de simulación (60Hz) sigue este orden estricto:

1.  **Captura de Input**: `UnifiedInputSystem` traduce teclas/toques a acciones.
2.  **Física y Movimiento**: `MovementSystem` integra velocidades.
3.  **Detección de Colisiones**: `CollisionSystem2D` genera eventos.
4.  **Lógica de Juego**: Los sistemas específicos (ej: `AsteroidsGame`) procesan eventos.
5.  **Jerarquías**: `HierarchySystem` calcula posiciones de mundo.
6.  **Presentación**: `RenderUpdateSystem` prepara estelas y efectos visuales.

## 3. Reglas de Oro para Desarrolladores

### Determinismo ante todo
- Nunca uses `Math.random()`. Usa `RandomService.getInstance("gameplay")`.
- Nunca uses `Date.now()`. Usa el `deltaTime` proporcionado por el sistema o `elapsedTime` del snapshot.

### Desacoplamiento de Datos
- No añadas lógica a los componentes. Solo propiedades de datos.
- No añadas estado mutable a los sistemas. El estado debe vivir en los componentes o recursos del `World`.

### Gestión de Memoria
- Evita crear objetos (`{}`) o arrays (`[]`) en el método `update()` de un sistema.
- Usa pools para entidades o componentes que se crean y destruyen con frecuencia.

## 4. Primeros Pasos Sugeridos

1.  **Explora un Juego**: Mira `src/games/Asteroids/AsteroidsGame.ts` para ver cómo se ensambla un juego.
2.  **Crea un Componente**: Añade una nueva propiedad a `CoreComponents.ts`.
3.  **Implementa un Sistema**: Crea un sistema sencillo que reaccione a tu nuevo componente.
4.  **Registra un Shape**: Añade un nuevo dibujo en `CanvasRenderer.ts` y úsalo en tu juego.

## 5. Glosario de Términos

- **World**: La base de datos central de ECS.
- **Entity**: Un simple ID numérico.
- **Component**: Una bolsa de datos con un `type`.
- **System**: El código que hace que las cosas se muevan.
- **Snapshot**: Una foto del estado visual para el renderer.
- **Alpha**: El factor de interpolación entre ticks físicos.

## Arquitectura del Motor de Juego

### Sistema ECS (Entity-Component-System)

El juego implementa un patrón ECS puro definido en `src/game/ecs-world.ts`:

- **Entidades**: Identificadores numéricos únicos.
- **Componentes**: Datos puros sin lógica.
- **Sistemas**: Lógica de procesamiento que opera sobre conjuntos de componentes.

La clase `World` actúa como registro central que gestiona el ciclo de vida de estos tres elementos, permitiendo un desacoplamiento total entre los datos y el comportamiento.

### Tipos de Componentes del Juego

El sistema define 9 tipos de componentes en `src/types/GameTypes.ts`:

| Componente           | Propósito               | Propiedades Clave                         |
| -------------------- | ----------------------- | ----------------------------------------- |
| `PositionComponent`  | Ubicación espacial      | `x, y`                                    |
| `VelocityComponent`  | Movimiento físico       | `dx, dy`                                  |
| `RenderComponent`    | Representación visual   | `shape, size, color, rotation`            |
| `ColliderComponent`  | Detección de colisiones | `radius`                                  |
| `InputComponent`     | Entrada del jugador     | `thrust, rotateLeft, rotateRight, shoot`  |
| `HealthComponent`    | Sistema de vida         | `current, max`                            |
| `TTLComponent`       | Tiempo de vida          | `remaining`                               |
| `AsteroidComponent`  | Metadatos de asteroide  | `size: "large" | "medium" | "small"`      |
| `GameStateComponent` | Estado global del juego | `lives, score, level, isGameOver`         |

### Sistemas de Procesamiento

El motor ejecuta los siguientes sistemas secuencialmente en cada frame:

1. **`InputSystem`**: Procesa la entrada (teclado o controles táctiles) y actualiza la rotación y el empuje.
2. **`MovementSystem`**: Aplica la velocidad a la posición y gestiona el envoltorio (wrapping) de pantalla.
3. **`CollisionSystem`**: Detecta impactos entre entidades y resuelve sus efectos (daño, fragmentación, puntos).
4. **`TTLSystem`**: Elimina proyectiles u otros objetos cuando expira su tiempo de vida.
5. **`GameStateSystem`**: Gestiona las oleadas de enemigos, el progreso de nivel y las condiciones de fin de partida.

### Configuración del Juego

Las constantes de equilibrio (velocidades, aceleración, tiempos) están centralizadas en `GAME_CONFIG` dentro de `src/types/GameTypes.ts`, lo que facilita el ajuste de la jugabilidad sin modificar la lógica de los sistemas.

### Factory Pattern para Entidades

Para simplificar la creación de objetos complejos (que requieren múltiples componentes), se utiliza `src/game/EntityFactory.ts`. Esto garantiza que, por ejemplo, cada nave o asteroide se cree siempre con el conjunto correcto de componentes iniciales.

### Gestión de Estado y Sincronización React

La integración con React se realiza mediante un patrón de **suscripción**:

1. El componente `App` se suscribe a los cambios del `AsteroidsGame`.
2. El `AsteroidsGame` notifica a los suscriptores al final de cada ciclo del motor.
3. React actualiza su estado interno y fuerza un re-renderizado para reflejar los cambios visuales en el `GameRenderer`.

Este enfoque garantiza que la UI esté siempre sincronizada con el estado interno del motor de juego sin incurrir en el overhead del polling constante.

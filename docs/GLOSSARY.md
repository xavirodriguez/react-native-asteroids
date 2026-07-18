# Glosario Técnico y de Juego — TinyAsterEngine

Este glosario define los términos que presentan ambigüedad entre el motor central (`packages/core`) y los juegos específicos, términos cuyo significado técnico cambió tras decisiones de diseño, o jerga particular de juego que tiene comportamientos no evidentes.

---

### Términos Ambiguos / Multi-contexto

#### Boundary ⚠️
*   **En el motor (Core):** Representado por `BoundaryComponent` (tipo `"Boundary"`) y `BoundarySystem`. Se encarga de controlar de manera automatizada los límites de pantalla de entidades arbitrarias mediante comportamientos genéricos como envolver (`wrap`), rebotar (`bounce`) o destruir (`destroy`) al salir del viewport.
*   **En un juego (Space Invaders):** No utiliza el `BoundarySystem` del core. En su lugar, el `SpaceInvadersFormationSystem` calcula dinámicamente en cada frame la caja de contención (`minX`, `maxX`) del bloque de invasores vivos y realiza un chequeo predictivo de límites para invertir la marcha y ordenar un descenso vertical.

#### Combo / ComboSystem ⚠️
*   **En el motor (Core):** Sistema genérico (`ComboSystem`) y componente `"Combo"` de soporte arcade que reduce de forma continua un `timerRemaining` e invalida el multiplicador (`multiplier = 1`, `combo = 0`) si expira.
*   **En un juego (Space Invaders):** Maneja sus campos de combo locales dentro de `GameStateComponent`, pero el `SpaceInvadersGameStateSystem` los sincroniza manualmente con el componente `"Combo"` del core en cada frame para fines de renderizado e interoperabilidad.
*   **En un juego (Flappy Bird):** Maneja su propia variable `comboMultiplier` local dentro del componente `FlappyBirdState` (tipo `"FlappyState"`), de manera 100% independiente del sistema de combos del core.

#### GameState / PongState / FlappyState ⚠️
*   **En el motor (Core):** `BaseGameStateSystem` es una clase de sistema abstracta para estructurar el control de flujos de juego, victoria/derrota y reinicios de forma genérica.
*   **En un juego (Asteroids / Space Invaders):** El estado se almacena en un componente singleton específico llamado `"GameState"` (tipo `"GameState"`) que guarda vidas, nivel actual, puntaje acumulado y banderas de fin de juego.
*   **En un juego (Pong):** No utiliza el componente `"GameState"`. Define un componente personalizado llamado `PongState` (tipo `"PongState"`).
*   **En un juego (Flappy Bird):** No utiliza el componente `"GameState"`. Define un componente personalizado llamado `FlappyBirdState` (tipo `"FlappyState"`).

#### Input / InputState ⚠️
*   **En el motor (Core):** El componente `InputStateComponent` (tipo `"InputState"`) actúa como un buffer genérico y de bajo nivel que almacena diccionarios planos de ejes (`axes`) y botones (`buttons`).
*   **En un juego (Asteroids):** Utiliza un componente `"Input"` que mapea discretamente banderas de control físico de la nave (`rotateLeft`, `rotateRight`, `thrust`, `shoot`, `hyperspace`, `rotationAmount`).
*   **En un juego (Space Invaders):** Utiliza un componente `"Input"` que mapea discretamente (`moveLeft`, `moveRight`, `shoot`, `shootCooldownRemaining`).
*   **En un juego (Flappy Bird):** Utiliza un componente `"FlappyInput"` con campos específicos para la física del ave (`flap`, `glide`, `flapCooldownRemaining`).
*   **En un juego (Pong):** No es un componente ECS. Es un objeto plano con la firma `PongInput` (`p1Up`, `p1Down`, `p2Up`, `p2Down`) para el control de paletas de ambos jugadores.

---

### Términos que cambiaron de significado tras Decisiones de Diseño

#### destroy vs dispose
*   **Significado actual:** La clase base abstracta de ECS `System` define únicamente la firma `dispose(): void {}` como ciclo de vida oficial para liberar recursos, listeners y desregistrar componentes del World. El término `destroy` sobrevive en la literatura antigua y tareas históricas del proyecto, pero en el código real se utiliza estrictamente `dispose`.

#### entities
*   **Significado actual (DECISION-001):** La propiedad `World.entities` devuelve un array de lectura ordenada (`ReadonlyArray<Entity>`) apoyado en una caché interna (`cachedEntities`). No realiza una ordenación dinámica en $O(N \log N)$ en cada frame. La caché solo se invalida y recalcula ante mutaciones estructurales (como la adición o eliminación de entidades).

#### invulnerableRemaining
*   **Significado actual:** Este campo de control de daño temporal fue centralizado globalmente en el componente de salud central `HealthComponent` (tipo `"Health"`). Los sistemas específicos de los juegos (ej: `InvulnerabilitySystem` de Space Invaders) consumen y decrementan este campo común en lugar de programar contadores de invulnerabilidad customizados.

#### stateVersion
*   **Significado actual:** Entero incremental asociado al estado de cada componente. No se permite mutar propiedades de componentes de forma directa (esto está congelado mediante `Object.freeze()` en modo `__DEV__`); se debe utilizar obligatoriamente `mutateComponent`, que incrementa `stateVersion` para notificar al serializador binario y evitar desincronizaciones de red en el servidor Colyseus.

---

### Jerga Específica de Juegos

#### Formation (Space Invaders)
*   Coordinador central del movimiento de la grilla de invasores en bloque, representado por un único componente singleton (`FormationComponent`). Su velocidad incrementa dinámicamente de forma proporcional a la cantidad de invasores destruidos y gestiona el estado pendiente de descenso vertical (`stepDownPending`) del grupo completo.

#### Glide (Flappy Bird)
*   Mecánica de planeo controlada por `FlappyBirdGlideSystem`. No anula la gravedad, sino que aplica de forma continua una fuerza vertical opuesta en el eje Y cuando el jugador mantiene el comando activo. Tiene un 20% de probabilidad por tick de generar emisores de partículas de viento en la parte trasera del ave.

#### Kamikaze (Space Invaders)
*   Comportamiento destructivo que asumen invasores individuales de forma aleatoria al morir cierta cantidad de enemigos en pantalla. Consta de dos fases: `"diving"` (donde el invasor se vuelve de color rojo, rota apuntando al jugador y desciende persiguiendo sus coordenadas X/Y) y `"returning"` (donde el invasor remanente sube a mitad de velocidad para reincorporarse a su coordenada de origen en la formación y pierde el componente `"Kamikaze"`).

#### Spin (Pong)
*   Efecto de curvatura física aplicado a la bola en `PongSpinSystem` cuando golpea una paleta en movimiento. Se calcula un `spinFactor` en base a la velocidad de la paleta en el momento del impacto; este factor altera progresivamente la velocidad vertical (`vy`) de la bola en cada frame y decae gradualmente hasta disiparse por completo.

# Glosario Técnico de TinyAsterEngine

Este documento define de forma precisa y corta los términos que presentan ambigüedad o múltiples significados entre el motor central (`packages/core`) y los juegos específicos, cambios de diseño clave, o jerga particular de un juego concreto.

---

## Términos Ambiguos / Multi-contexto ⚠️

#### Boundary ⚠️
*   **En el motor (Core):** Representado por `BoundaryComponent` (tipo `"Boundary"`) y `BoundarySystem`. Controla los límites de pantalla mediante comportamientos genéricos automatizados como envolver (`wrap`), rebotar (`bounce`) o destruir (`destroy`) entidades al salir del viewport.
*   **En un juego (Space Invaders):** No utiliza el `BoundarySystem` del core. La lógica reside en `SpaceInvadersFormationSystem`, que calcula dinámicamente la caja de contención (`minX`, `maxX`) del bloque de invasores vivos y realiza un chequeo predictivo para invertir la dirección y ordenar el descenso vertical.

#### Combo / ComboSystem ⚠️
*   **En el motor (Core):** Sistema genérico (`ComboSystem`) y componente `"Combo"` de soporte arcade que decrementa continuamente el tiempo restante (`timerRemaining`) y restablece el multiplicador (`multiplier = 1`, `combo = 0`) al expirar.
*   **En un juego (Space Invaders):** Maneja sus campos de combo locales en su propio `GameStateComponent`, pero el `SpaceInvadersGameStateSystem` los sincroniza manualmente con el componente `"Combo"` del core en cada frame para fines de renderizado.
*   **En un juego (Flappy Bird):** Maneja su propia variable `comboMultiplier` local en el componente `FlappyBirdState` (tipo `"FlappyState"`), de manera 100% independiente del sistema de combos del core.
*   **En un juego (Pong):** Maneja su propia variable `comboMultiplier` local dentro del componente `PongState` (tipo `"PongState"`), independiente del core.

#### GameState / PongState / FlappyState ⚠️
*   **En el motor (Core):** `BaseGameStateSystem` es una clase de sistema abstracta para estructurar el control de flujos de juego, victoria/derrota y reinicios de forma genérica.
*   **En un juego (Asteroids / Space Invaders):** El estado se almacena en un componente singleton específico llamado `"GameState"` (tipo `"GameState"`) que guarda vidas, nivel actual, puntaje acumulado y banderas de fin de juego.
*   **En un juego (Pong):** Define un componente personalizado llamado `PongState` (tipo `"PongState"`).
*   **En un juego (Flappy Bird):** Define un componente personalizado llamado `FlappyBirdState` (tipo `"FlappyState"`).

#### Input / InputState ⚠️
*   **En el motor (Core):** El componente `InputStateComponent` (tipo `"InputState"`) actúa como un buffer genérico y de bajo nivel que almacena diccionarios planos de ejes (`axes`) y botones (`buttons`).
*   **En un juego (Asteroids):** Utiliza un componente `"Input"` que mapea discretamente banderas de control físico de la nave (`rotateLeft`, `rotateRight`, `thrust`, `shoot`, `hyperspace`, `rotationAmount`).
*   **En un juego (Space Invaders):** Utiliza un componente `"Input"` que mapea discretamente (`moveLeft`, `moveRight`, `shoot`, `shootCooldownRemaining`).
*   **En un juego (Flappy Bird):** Utiliza un componente `"FlappyInput"` con campos específicos para la física del ave (`flap`, `glide`, `flapCooldownRemaining`).
*   **En un juego (Pong):** No es un componente ECS. Es un objeto plano con la firma `PongInput` (`p1Up`, `p1Down`, `p2Up`, `p2Down`) para el control de paletas de ambos jugadores.

---

## Términos con Cambio de Significado tras Decisiones de Diseño

#### destroy vs dispose
*   **Significado actual:** La clase base abstracta de ECS `System` define únicamente la firma `dispose(): void {}` como ciclo de vida oficial para liberar recursos, listeners y desregistrar componentes del World. El término `destroy` sobrevive en la literatura antigua, pero en el código real de sistemas se utiliza estrictamente `dispose`.

#### entities
*   **Significado actual (DECISION-001):** La propiedad `World.entities` devuelve un array de lectura ordenada (`ReadonlyArray<Entity>`) apoyado en una caché interna (`cachedEntities`). No realiza una ordenación dinámica en $O(N \log N)$ en cada frame, invalidándose la caché únicamente ante mutaciones estructurales.

#### invulnerableRemaining
*   **Significado actual:** Este campo de control de daño temporal fue centralizado globalmente en el componente de salud central `HealthComponent` (tipo `"Health"`). Los sistemas específicos de los juegos (ej: `InvulnerabilitySystem` de Space Invaders) consumen y decrementan este campo común en lugar de programar contadores de invulnerabilidad customizados.

#### stateVersion
*   **Significado actual:** Entero incremental asociado al estado de cada componente. En modo `__DEV__`, las propiedades obtenidas vía `getComponent` están congeladas con `Object.freeze()`. Es obligatorio usar `mutateComponent` o `getMutableComponent` (que clona el componente si está congelado), lo cual incrementa `stateVersion` para notificar al serializador binario y evitar desincronizaciones en la red.

---

## Jerga Específica de Juegos

#### Formation (Space Invaders)
*   Coordinador central de la grilla de invasores en bloque, representado por un único componente singleton (`FormationComponent`). Su velocidad incrementa de forma proporcional a la cantidad de invasores destruidos y gestiona el estado pendiente de descenso vertical (`stepDownPending`) del grupo completo.

#### Glide (Flappy Bird)
*   Mecánica de planeo controlada por `FlappyBirdGlideSystem`. Aplica de forma continua una fuerza vertical opuesta en el eje Y cuando el jugador mantiene el comando activo para amortiguar la gravedad. Tiene un 20% de probabilidad por tick de generar emisores de partículas de viento.

#### Kamikaze (Space Invaders)
*   Comportamiento destructivo que asumen invasores individuales de forma aleatoria al morir cierta cantidad de enemigos. Consta de dos fases: `"diving"` (el invasor se vuelve rojo, rota apuntando al jugador y desciende persiguiendo sus coordenadas) y `"returning"` (sube a mitad de velocidad para reincorporarse a su coordenada de origen en la formación y pierde el componente `"Kamikaze"`).

#### Spin (Pong)
*   Efecto de curvatura física aplicado a la bola en `PongSpinSystem` al golpear una paleta en movimiento. Se calcula un `spinFactor` en base a la velocidad de la paleta en el momento del impacto, el cual altera progresivamente la velocidad vertical (`vy`) de la bola en cada frame y decae gradualmente.

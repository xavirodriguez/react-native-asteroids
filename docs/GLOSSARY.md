# Glosario Técnico de TinyAsterEngine

Este documento define de forma precisa y corta los términos que presentan ambigüedad o múltiples significados entre el motor central (`packages/core`) y los juegos específicos, cambios de diseño clave, o jerga particular de un juego concreto.

---

## Términos Ambiguos / Multi-contexto ⚠️

#### Boundary ⚠️
*   **En el motor (Core):** Representado por `BoundaryComponent` (tipo `"Boundary"`) y `BoundarySystem`. Controla los límites de pantalla mediante comportamientos genéricos automatizados como envolver (`wrap`), rebotar (`bounce`) o destruir (`destroy`) entidades individuales al salir del viewport.
*   **En un juego (Space Invaders):** El bloque de invasores no se gestiona mediante el `BoundarySystem` del core. La lógica reside en `SpaceInvadersFormationSystem`, que calcula dinámicamente la caja de contención (`minX`, `maxX`) de los invasores vivos y realiza un chequeo predictivo de bordes para cambiar de dirección lateral y ordenar el descenso vertical (paso de bajada). Sin embargo, las entidades individuales (balas, jugador) sí usan el `BoundaryComponent` del core.
*   **En un juego (Pong):** La bola usa `BoundaryComponent` en modo `"bounce"` para los límites superior e inferior (eje Y). Sin embargo, los límites laterales (eje X) no se gestionan mediante el core, sino de manera ad-hoc en `PongGameStateSystem` y `PongCollisionSystem` para registrar anotaciones de puntos y reiniciar la bola.

#### Collider vs Collider2D ⚠️
*   **Collider (tipo `"Collider"`):** Componente de colisión del core que trabaja junto con los sistemas centrales `CollisionSystem2D` (Sweep-and-Prune broad-phase y narrow-phase) y `CCDSystem` (Continuous Collision Detection por trazado de rayos). Utilizado en **Pong** y **Asteroids** (el cual usa `CollisionSystem2D` para sus interacciones).
*   **Collider2D (tipo `"Collider2D"`):** Componente independiente del core que es consumido únicamente por sistemas de colisión específicos y personalizados de juegos concretos que implementan su propio cálculo ad-hoc de intersección e impacto, tales como **Space Invaders** (`SpaceInvadersCollisionSystem`) y **Flappy Bird** (`FlappyBirdCollisionSystem`), puenteando y omitiendo el pipeline de colisiones genérico del core.

#### Combo / ComboSystem ⚠️
*   **En el motor (Core):** Sistema genérico (`ComboSystem`) y componente `"Combo"` (`ComboComponent`) de soporte arcade que decrementa continuamente el tiempo restante (`timerRemaining`) y restablece el multiplicador (`multiplier = 1`, `combo = 0`) al expirar.
*   **En un juego (Space Invaders):** No utiliza el `ComboSystem` ni el componente `"Combo"` del core. Define sus propios campos locales `combo`, `multiplier` y `comboTimerRemaining` dentro de su propio singleton `GameStateComponent`, y los decrementa/reinicia de forma autónoma en `SpaceInvadersGameStateSystem` y `SpaceInvadersCollisionSystem`.
*   **En un juego (Flappy Bird):** Maneja su propia variable `comboMultiplier` local en el componente `FlappyBirdState` (tipo `"FlappyState"`), de manera 100% independiente del sistema de combos del core.
*   **En un juego (Pong):** Maneja su propia variable `comboMultiplier` local dentro del componente `PongState` (tipo `"PongState"`), independiente del core.

#### GameState ⚠️
*   **En el motor (Core):** `BaseGameStateSystem` es una clase de sistema abstracta para estructurar el control de flujos de juego, victoria/derrota y reinicios de forma genérica. No provee un componente `"GameState"` nativo en el core.
*   **En un juego (Asteroids / Space Invaders):** El estado se almacena en un componente singleton específico llamado `"GameState"` (tipo `"GameState"`) que guarda vidas, nivel actual, puntaje acumulado y banderas de fin de juego. A pesar de compartir el mismo tipo `"GameState"`, sus esquemas son distintos y específicos para cada juego.
*   **En un juego (Pong):** Define un componente de estado llamado `PongState` (tipo `"PongState"`).
*   **En un juego (Flappy Bird):** Define un componente de estado llamado `FlappyBirdState` (tipo `"FlappyState"`).

#### Input / InputState ⚠️
*   **En el motor (Core):** El componente `InputStateComponent` (tipo `"InputState"`) actúa como un buffer genérico y de bajo nivel que almacena diccionarios planos de ejes (`axes`) y botones (`buttons`).
*   **En un juego (Asteroids):** Utiliza un componente `"Input"` (tipo `"Input"`) con campos discretos de control físico de la nave (`rotateLeft`, `rotateRight`, `thrust`, `shoot`, `hyperspace`, `rotationAmount`).
*   **En un juego (Space Invaders):** Utiliza un componente `"Input"` (tipo `"Input"`) con campos discretos (`moveLeft`, `moveRight`, `shoot`, `shootCooldownRemaining`).
*   **En un juego (Flappy Bird):** Utiliza un componente `"FlappyInput"` (tipo `"FlappyInput"`) con campos específicos para la física del ave (`flap`, `glide`, `flapCooldownRemaining`).
*   **En un juego (Pong):** No es un componente ECS. Es un objeto de tipo TypeScript plano con la firma `PongInput` (`p1Up`, `p1Down`, `p2Up`, `p2Down`) para el control de paletas de ambos jugadores.

---

## Términos con Cambio de Significado tras Decisiones de Diseño

#### destroy vs dispose
*   **Significado actual:** La clase base abstracta de ECS `System` define únicamente la firma `dispose(): void {}` como ciclo de vida oficial para liberar recursos, listeners y desregistrar componentes del World. El término `destroy` sobrevive en la literatura antigua y en la firma de ciclo de vida de los controladores de juego de alto nivel como `BaseGame.destroy()`, pero en el código real de sistemas se utiliza estrictamente `dispose()`.

#### entities
*   **Significado actual (DECISION-001):** La propiedad `World.entities` devuelve un array de lectura ordenada (`ReadonlyArray<Entity>`) apoyado en una caché interna (`cachedEntities`). No realiza una ordenación dinámica en $O(N \log N)$ en cada frame, invalidándose la caché únicamente ante mutaciones estructurales del mundo (como creación, eliminación o vaciado de entidades).

#### invulnerableRemaining
*   **Significado actual:** Este campo de control de daño temporal fue centralizado globalmente en el componente de salud central `HealthComponent` (tipo `"Health"`). Los sistemas específicos de los juegos (ej: `InvulnerabilitySystem` de Space Invaders y la renderización en `FlappyBirdCanvasVisuals.ts`) consumen y decrementan este campo común en lugar de programar contadores de invulnerabilidad customizados.

#### stateVersion
*   **Significado actual:** Entero incremental asociado al estado del `World` que indica mutaciones en el estado de sus componentes. Se incrementa automáticamente cada vez que se llama a `mutateComponent` o `getMutableComponent` de un componente congelado en modo de desarrollo (`__DEV__`). Esto notifica al serializador de red y evita desincronizaciones en la simulación.

---

## Jerga Específica de Juegos

#### Formation (Space Invaders)
*   Coordinador central de la grilla de invasores en bloque, representado por un único componente singleton (`FormationComponent`). Su velocidad incrementa de forma proporcional a la cantidad de invasores destruidos y gestiona el estado pendiente de descenso vertical (`stepDownPending`) del grupo completo.

#### Glide (Flappy Bird)
*   Mecánica de planeo controlada por `FlappyBirdGlideSystem`. Aplica de forma continua una fuerza vertical opuesta para amortiguar un 70% de la gravedad cuando el jugador mantiene el comando activo. Tiene un 20% de probabilidad por tick de generar emisores de partículas de viento de tipo `"glide"`.

#### Kamikaze (Space Invaders)
*   Comportamiento destructivo que asumen invasores individuales de forma aleatoria al morir cierta cantidad de enemigos (menos del 60% vivos). Consta de dos fases: `"diving"` (el invasor se vuelve rojo, rota apuntando al jugador y desciende persiguiendo sus coordenadas) y `"returning"` (sube a mitad de velocidad para reincorporarse a su coordenada de origen en la formación y pierde el componente `"Kamikaze"`).

#### Spin (Pong)
*   Efecto de curvatura física aplicado a la bola en `PongSpinSystem` al golpear una paleta en movimiento. Se calcula un `spinFactor` en `PongCollisionSystem` en base a la velocidad de la paleta en el momento del impacto (`paddleComp.lastVelocityY`), el cual altera progresivamente la velocidad vertical (`vy`) de la bola en cada frame y decae gradualmente (multiplicándose por `1 - spinDecay` donde `spinDecay` es 0.02).

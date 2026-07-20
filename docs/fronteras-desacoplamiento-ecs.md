# Investigación: Fronteras Reales de Desacoplamiento entre Juegos y el ECS del Core

Este documento analiza la viabilidad y los límites técnicos para desacoplar la lógica de los cuatro juegos (`Asteroids`, `Flappy Bird`, `Pong`, `Space Invaders`) del motor ECS `@tiny-aster/core` (`World`, `Query`, `Schedule`, etc.). El objetivo de este análisis es trazar con precisión quirúrgica qué componentes y sistemas pertenecen a la lógica pura del juego (Independientes, **I**), cuáles dependen intrínsecamente del core ECS (Dependientes, **D**), y cuáles se encuentran en una zona intermedia de balance de diseño (Ambiguos, **?**).

---

## 1. Clasificación por Juego (Sistemas y Componentes)

### 1.1. Pong
Pong es el juego más simple del monorepo, enfocado en física básica de rebotes bidimensionales y una máquina de estado directa.

| Sistema / Componente / Recurso | Clasificación | Evidencia (Archivo:Líneas) | Justificación Breve |
| :--- | :---: | :--- | :--- |
| `PongCollisionSystem` | **?** | `PongCollisionSystem.ts:14-17` | Utiliza consultas de eventos de colisión físicas en `world.query("CollisionEvents")` para modificar el estado de la bola (`BallComponent`) y paletas (`PaddleComponent`). Es independiente de red o rollback, pero acoplado estructuralmente a la mutación protegida (`mutateComponent`) del ECS. |
| `PongGameStateSystem` | **I** | `PongGameStateSystem.ts:16-19` | Extiende `BaseGameStateSystem` que gestiona variables de puntuación y final de juego (`scoreP1`, `scoreP2`). Sus reglas de negocio (sumar puntos según el paso de la bola de los límites) son 100% lógicas de puntuación puras que podrían expresarse sin ECS. |
| `PongInputSystem` | **I** | `PongInputSystem.ts:32-35` | Traduce entradas en velocidad (`moveDir`). Aunque usa el `InputState` del ECS, la decisión lógica de mapear `buttons["p1Up"]` o control de IA / control remoto (`NetworkController`) a una dirección de movimiento `-1` o `1` es lógica de juego desacoplable. |
| `PongSpinSystem` | **D**| `PongSpinSystem.ts:5-8` | Ajusta la velocidad física de la bola de forma continua basándose en el ángulo de impacto y el arrastre de la paleta. Usa `world.query` e interactúa directamente con `VelocityComponent` y `TransformComponent` para inducir un efecto físico de curva de rotación en cada tick de la simulación. |
| `PongVelocityGuardrailSystem` | **D** | `PongVelocityGuardrailSystem.ts:12-15` | Sistema de seguridad física que previene magnitudes infinitas o anormales en el vector de velocidad. Al interactuar de forma intensiva con `VelocityComponent`, es estructuralmente dependiente de la simulación física del core. |
| `PongState` | **I** | `types.ts` / `types/PongConfigSchema.ts` | Su estructura de datos (puntuaciones de jugadores, bandera de fin de juego) es un objeto plano simple de JS sin lógica específica del ECS. |

---

### 1.2. Flappy Bird
Flappy Bird implementa scroll infinito de tuberías, físicas de gravedad simple con aleteo (flap) y amortiguación por planeo (glide).

| Sistema / Componente / Recurso | Clasificación | Evidencia (Archivo:Líneas) | Justificación Breve |
| :--- | :---: | :--- | :--- |
| `FlappyBirdCollisionSystem` | **?** | `FlappyBirdCollisionSystem.ts:20-23` | Controla las colisiones de muerte instantánea contra tuberías y suelo usando `world.query("CollisionEvents")`. Sin embargo, contiene una lógica compleja de **Near Miss** (`handleNearMissLogic` en línea 43) que no es física pura de colisión sino cálculo geométrico (distancia de tolerancia a AABB de tuberías) para bonificar puntos. |
| `FlappyBirdGameStateSystem` | **I** | `FlappyBirdGameStateSystem.ts:18-20` | Generador procedural de tuberías (`pipeSpawnTimer` y cálculo de brechas). La decisión matemática de cada cuánto generar un obstáculo y la lógica de incrementar puntuaciones al superar la coordenada X del jugador es lógica pura de negocio. |
| `FlappyBirdGlideSystem` | **D** | `FlappyBirdGlideSystem.ts:10-13` | Modifica la gravedad aplicada por el core de forma continua. Al reescribir dinámicamente los vectores de `VelocityComponent` en base al frame a frame de entrada de planeo, requiere interactuar directamente con la simulación física. |
| `FlappyBirdInputSystem` | **I** | `FlappyBirdInputSystem.ts:50-53` | Escucha la entrada de aleteo (`flap requested`) y aplica fuerza ascendente. El buffer de comandos (`InputBufferSystem` en línea 14) es una máquina de estados pura que decide el consumo del frame de entrada, el cual es conceptualmente portable. |
| `FlappyBirdRenderSystem` | **D** | `FlappyBirdRenderSystem.ts:12-15` | Hereda directamente de `RenderUpdateSystem` del core. Su única responsabilidad es rotar el sprite visual (`RenderComponent.rotation`) del pájaro de forma independiente de la tasa de refresco (`lerpFactor`) usando el vector de velocidad física. |
| `FlappyBirdState` | **I** | `types/FlappyBirdTypes.ts` | Almacena variables de puntuación, combo y banderas de juego de manera plana y serializable. |

---

### 1.3. Space Invaders
Space Invaders gestiona una horda de enemigos mediante un sistema rígido de formaciones interconectadas (Swarm Movement) y progresión por oleadas (Wave Management).

| Sistema / Componente / Recurso | Clasificación | Evidencia (Archivo:Líneas) | Justificación Breve |
| :--- | :---: | :--- | :--- |
| `SpaceInvadersCollisionSystem` | **?** | `SpaceInvadersCollisionSystem.ts:27-30` | Resuelve múltiples pares de colisiones complejos (proyectiles-alienígenas, proyectiles-escudos con puntos de salud fragmentados). Su lógica de degradación de escudos y popup flotante de combos flotantes con TTL de presentación (`Juice`, `UITextComponent`) mezcla lógica de juego con mutación estructural. |
| `SpaceInvadersFormationSystem` | **D** | `SpaceInvadersFormationSystem.ts:19-22` | Mueve uniformemente toda la horda de invasores como un solo cuerpo rígido. Realiza un barrido predictivo de bordes en base a las posiciones `TransformComponent` de los aliens supervivientes para alternar dirección de descenso. El Swarm de entidades es intrínsecamente un patrón ECS de alta densidad. |
| `SpaceInvadersGameStateSystem` | **I** | `SpaceInvadersGameStateSystem.ts:14-17` | Administra la progresión por niveles (proxima oleada), decrementos de combo por expiración de tiempo e inicialización de parámetros de wave. |
| `SpaceInvadersInputSystem` | **I** | `SpaceInvadersInputSystem.ts:32-35` | Vincula teclas y ejes para aplicar velocidades de traslación del cañón y disparar balas a través de un pool. Desacoplable del ECS, asumiendo una abstracción de entrada uniforme. |
| `SpaceInvadersRenderSystem` | **D** | `SpaceInvadersRenderSystem.ts:7-10` | Modifica directamente los datos de visualización del sprite (`RenderComponent`) en base a estados temporales del jugador, como parpadeo de color durante periodos de invulnerabilidad. |
| `KamikazeSystem` | **D** | `KamikazeSystem.ts:11-14` | Aplica una inteligencia artificial de picado en diagonal basada en vectores de posición hacia el jugador. Controla estados de picado/retorno mutando `VelocityComponent` y modificando propiedades de renderizado sobre la marcha en cada tick de simulación. |
| `BossSystem` | **D** | `BossSystem.ts:9-12` | Controla de forma activa el movimiento sinusoidal del jefe, sus fases de ataque en base a porcentajes de salud, y patrones de disparo de proyectiles en la fase física. Altamente integrado en el bucle de actualización del ECS. |
| `InvulnerabilitySystem` | **D** | `InvulnerabilitySystem.ts:8-11` | Decrementa de forma continua y segura los temporizadores de invulnerabilidad en `HealthComponent`. Su ejecución en la fase de Simulación está vinculada al orden de actualización del core de forma reproducible. |

---

### 1.4. Asteroids
Asteroids es la simulación estrella del monorepo, implementando físicas inerciales poligonales, envoltura de pantalla (wrapping boundaries), fricción progresiva y netcode autoritativo (server Colyseus).

| Sistema / Componente / Recurso | Clasificación | Evidencia (Archivo:Líneas) | Justificación Breve |
| :--- | :---: | :--- | :--- |
| `AsteroidCollisionSystem` | **D** | `AsteroidCollisionSystem.ts:6-9` | Altamente dependiente de `CollisionSystem2D` y las llamadas de la factoría física (`EntityPool` de partículas y balas). Su lógica de fragmentación de asteroides grandes en medianos/pequeños requiere manipulación estructural intensiva del `World`. |
| `AsteroidGameStateSystem` | **I** | `AsteroidGameStateSystem.ts:10-13` | Administra variables clásicas de puntuación, vidas y generación de oleadas de asteroides según el nivel alcanzado. |
| `AsteroidInputSystem` | **D** | `AsteroidInputSystem.ts:7-10` | Controla físicas de empuje inercial (`thrust`), disparos de proyectiles vinculados a pools (`BulletPool`) y teletransportación aleatoria (`hyperspace`). Integrado directamente con `MovementSystem` y `FrictionSystem` del core. |

---

## 2. Estado del Juego (`GameState` / `PongState` / `FlappyState`)

La *forma de los datos* de estos componentes de estado global de juego (puntuación, vidas, combo, nivel, etc.) **puede existir perfectamente como un objeto plano sin ser un componente ECS** para la ejecución en modo local (Single-Player).

Sin embargo, en el contexto de **sincronización multijugador y serialización de red**, existen restricciones técnicas rígidas que obligan a que sigan formando parte del `World` del ECS:

1. **Snapshots Deterministas**: El netcode del core recopila todo el estado serializable recorriendo los componentes del `World` (`SnapshotSerializer.ts` y `SnapshotSerializerSoA.ts`). Si el estado de juego se mantuviera en variables externas fuera del ECS, no se incluiría en los snapshots automáticos generados tick por tick, lo que impediría la persistencia del estado en fases de rollback y re-simulación.
2. **Rollback & Predicción de Red**: Durante un rollback de red, el motor retrocede el `tick` del `World` y restaura un snapshot anterior (re-simulando los frames de entrada atrasados). Si la puntuación, el combo o las banderas de "game over" estuvieran desacopladas del control del `World`, estas variables sufrirían desincronización irreversible frente a las correcciones que vienen del servidor.
3. **Capa Schema de Colyseus (Servidor)**: El servidor autoritativo (`server/src/schema/GameState.ts` y `AsteroidsRoom.ts`) utiliza sincronización directa basada en mapeos entre componentes del ECS y el Schema serializado de red. Mantenerlos bajo la disciplina de transacciones del core asegura robustez de tipos y transmisión optimizada de deltas.

---

## 3. Dependencia de Física Compartida

La física compartida y los sistemas de colisiones genéricos del core son:
* `MovementSystem` (actualización de posición en base a velocidad)
* `BoundarySystem` (límites de pantalla, bloqueo o envoltura/wrap)
* `FrictionSystem` (atenuación lineal de vectores de velocidad)
* `CollisionSystem2D` (detección sweep & prune, test de fase estrecha, colisiones físicas y triggers)
* `SpatialPartitioningSystem` (estructuración espacial en cuadrícula)
* `SpatialCullingSystem` (descarte dinámico fuera de viewport)

### Dependencias por Juego:

1. **Asteroids**: **Alta dependencia**. Utiliza `MovementSystem` para la inercia, `BoundarySystem` con modo de envoltura toroidal (wrapping de pantalla en los bordes), `FrictionSystem` para la resistencia de la nave, y `CollisionSystem2D` / `CCDSystem` (Continuous Collision Detection) para proyectiles de alta velocidad contra asteroides y ovnis poligonales. La reutilización de estos sistemas es del **100%**.
2. **Space Invaders**: **Dependencia moderada-baja**.
   * Utiliza `MovementSystem` de forma secundaria. La formación del swarm de alienígenas se mueve mediante manipulación directa de coordenadas espaciales en bloque (`SpaceInvadersFormationSystem.ts:50-57`), omitiendo la física genérica de velocidad del core para mantener la rigidez espacial.
   * Utiliza `CollisionSystem2D` de forma intensiva para proyectiles, jugadores e invasores, y `BoundarySystem` para evitar que el jugador exceda los bordes de la pantalla.
3. **Flappy Bird**: **Dependencia baja**.
   * Depende de `MovementSystem` para la caída acelerada por gravedad.
   * La generación y traslación de tuberías se realiza a mano. No utiliza `FrictionSystem` ni `BoundarySystem` genérico (las tuberías fuera de pantalla se limpian mediante lógica ad-hoc en su game state system).
   * Utiliza `CollisionSystem2D` exclusivamente para la colisión bird-pipe y bird-ground.
4. **Pong**: **Dependencia baja**.
   * Depende de `MovementSystem` para mover la pelota y las paletas.
   * No utiliza `BoundarySystem` genérico ya que el rebote de la pelota en los bordes superior e inferior y la puntuación se calculan de manera ad-hoc dentro de sus propios sistemas.
   * Utiliza `CollisionSystem2D` para el rebote físico con las paletas, pero invalida y sobreescribe manualmente las posiciones para evitar que la pelota se "trabe" dentro del volumen de la paleta.

**Conclusión Práctica**: La hipótesis de que estos sistemas físicos genéricos se reutilizan perfectamente entre juegos **no se sostiene por completo en la realidad**. Pong y Space Invaders sobreescriben o esquivan partes esenciales de la física del core para forzar rigidez matemática (los rebotes de Pong y el alineamiento de Space Invaders). Asteroids es el único que exprime todo el pipeline físico nativo del core sin interferencias.

---

## 4. Dependencia de Red y Determinismo (Asteroids)

La lógica de Asteroids está intrínsecamente atada al pipeline de red y determinismo del core. Las siguientes partes del código forman parte inequívoca de la categoría de dependencias de simulación protegidas (**D**) y **no pueden desacoplarse** sin romper la sincronización multijugador:

1. **Pipeline de Predicción Local de Entrada**: `AsteroidsGame.ts:167` delega la simulación del jugador local al controlador de red (`NetworkController.ts:37` -> `predictLocalPlayer`), aplicando comandos de entrada sobre la nave y ejecutando un paso de simulación local antes de que llegue la confirmación del servidor. Desacoplar el juego del ECS rompería el seguimiento exacto de las réplicas del estado local predicho.
2. **Re-simulación y Reconciliación por Rollback**: Cuando se reciben actualizaciones autoritativas atrasadas del servidor, el motor retrocede al tick de discrepancia y re-simula los frames locales de entrada usando `world.update()` en modo de re-simulación (`isReSimulating = true` en `World.ts`). Todo el bucle físico, el pool de proyectiles y el estado del jugador se recalculan en microsegundos de forma idéntica. Si los datos no residieran de forma homogénea en la estructura compacta de componentes de `@tiny-aster/core`, este retroceso matemático fallaría estrepitosamente.
3. **Serialización Compacta SoA y Compresión Binaria**: Para optimizar el ancho de banda en el servidor, Asteroids utiliza snapshots orientados a estructura de arreglos con TypedArrays (`UseSoASnapshots` en `AsteroidsRoom.ts:98` y `SnapshotSerializerSoA.ts`). Estos TypedArrays se empaquetan en buffers binarios de red transmitidos directamente al cliente para su reconstrucción de bajo costo para el recolector de basura (GC). Esto requiere un alineamiento estricto e inmutable entre el formato de memoria de componentes físicos del core y el transporte de red, haciendo inviable desacoplarlos de su API subyacente.

---

## 5. Costo de un ECS Mínimo

Una alternativa viable para ganar portabilidad en juegos simples sin red (como Flappy Bird o Pong) sin arrastrar la complejidad del motor de snapshots, predicciones y estructuras binarias complejas, sería introducir un **ECS Mínimo / Light**.

### Evaluación de Esfuerzo (Costo Estimado: 40-60 horas de desarrollo)

* **Estructura Existente**: No existe actualmente una versión simplificada de `World` o `Schedule` en el repositorio. Todo el código de `@tiny-aster/core` asume snapshots delta, SoA, tracking de versiones de estado (`stateVersion`, `structureVersion`) y buffers de comandos unificados.
* **Componentes Necesarios de un ECS Mínimo**:
  * Un gestor simple de entidades (generador numérico incremental secuencial).
  * Mapas planos (`Map<Entity, Component>`) para almacenar componentes sin versionamiento ni clonación defensiva con congelamiento en modo de desarrollo (`Object.freeze`).
  * Un evaluador simple de Queries basado en intersección básica de conjuntos de componentes (sin caché indexado ni queries reactivas precalculadas por componente).
  * Un `Schedule` básico que ejecute sistemas secuenciales simples (sin fases de render, pre-simulación ni rollback).
* **Riesgos y Limitaciones**:
  * **Pérdida de Rendimiento**: Al no contar con índices de queries reactivas, el rendimiento decaerá rápidamente al superar las cientas de entidades (no apto para juegos de alta densidad como Asteroids o Space Invaders).
  * **Fragmentación del Repositorio**: Se introduce una bifurcación en el modelo mental de programación: ¿cuándo programar contra el Core ECS y cuándo contra el ECS Mínimo? Esto eleva la fricción cognitiva para futuros colaboradores.

---

## 6. Preguntas Transversales

### 6.1. ¿Hay algún juego que resulte casi completamente (I) — es decir, un buen primer candidato real para un desacople piloto de bajo riesgo?
**Sí, Flappy Bird**.
* **Puntuación y Reglas de Juego**: Su Game State (`score`, `comboMultiplier`) se puede modelar de forma aislada sin interacción con componentes.
* **Tuberías procedurales**: El spawner es cálculo de tiempos puro que calcula una altura aleatoria de brecha y genera obstáculos en coordenadas `X` que van avanzando linealmente a velocidad constante.
* **Simplicidad de entrada**: Solo tiene un botón de acción (`flap`) que resetea la velocidad vertical `vy` a un valor fijo negativo (fuerza de impulso vertical).
* **Ausencia de Netcode**: En su variante monojugador (local), no depende de mecánicas deterministas complejas de red, predicción de entrada o reconciliación de frames, por lo que el riesgo de regresión es mínimo.

### 6.2. ¿Hay algún juego que resulte casi completamente (D) y por tanto el desacople no sea recomendable en absoluto sin una reescritura mayor?
**Sí, Asteroids**.
* **Netcode Autoritativo Activo**: Su implementación multijugador utiliza un servidor autoritativo basado en Colyseus (`AsteroidsRoom.ts`). Toda su simulación física del lado de la nave del jugador y disparo está acoplada al milisegundo al pipeline de predicción, corrección y re-simulación determinista por rollback de `@tiny-aster/core`.
* **Física Multidimensional**: El comportamiento de aceleración angular, fricción inercial suave y envoltura de bordes de pantalla requiere interacción nativa y estrecha con todos los sistemas de física genéricos del motor. Intentar desacoplarlo resultaría en la duplicación manual de más del 80% del motor de física en la capa del juego, perdiendo todo el sentido del desacoplamiento.

### 6.3. ¿El trabajo ya existente en `packages/core/src/games/arcade/` (`ComboSystem`, `LootSystem`, `PowerUpSystem`) es reutilizable como base de una futura capa de "lógica de gameplay compartida"?
**Es parcialmente ortogonal.**
* El enfoque actual de `LootSystem.ts` y `PowerUpSystem.ts` consiste en **sistemas ECS tradicionales** que interactúan directamente con tipos de componentes específicos (`LootTableComponent`, `PowerUpComponent`, `TransformComponent`).
* Por lo tanto, no están desacoplados de la UI ni de la infraestructura del core actual; simplemente son lógicas que se pueden prender o apagar en el `World` de cualquier juego (comportamiento plug-and-play).
* Para que sean "lógicas de gameplay compartidas pero desacopladas de la infraestructura de ECS/UI", se requeriría una refactorización para transformarlos en **fórmulas lógicas puras u objetos lógicos JS planos** (sin heredar de `System` ni consultar `world.query`), los cuales recibirían datos planos de entrada y retornarían comandos lógicos de negocio.

---

## 7. Recomendación de Candidato Piloto

El candidato ideal e indiscutible para realizar un desacople piloto de bajo riesgo es **Flappy Bird** (en su variante de un solo jugador / offline).

### Plan de Desacople Piloto Propuesto (Sin Codificar):
1. **Aislamiento de la Máquina de Estados**: Mudar `FlappyBirdState` y sus reglas de mutación lógica a una clase lógica pura `FlappyBirdSimulation` que no use `world.getSingleton` ni `mutateSingleton`.
2. **Definición de Entidades de Datos Planos**: Representar los elementos del juego (pájaro, tuberías) como objetos de JS simples con propiedades numéricas (`x`, `y`, `vy`, `gapY`).
3. **Física e Inputs Puros**: Implementar un paso de simulación `update(dt, inputAction)` que aplique la gravedad linealmente y traslade las tuberías hacia la izquierda en base a tiempo puro, resolviendo el solapamiento de rectángulos y círculos mediante funciones matemáticas nativas de JS en vez de `CollisionSystem2D`.
4. **Capa Adaptadora**: Diseñar una capa de traducción opcional que lea este modelo plano y cree entidades virtuales en el ECS únicamente para el pintado visual en pantalla (Skia / Canvas Adapters).

Esto demostraría que es posible ejecutar la lógica de Flappy Bird en cualquier plataforma (incluso headless en consola o en la web con un renderizado vanilla de 2D) sin arrastrar la suite completa de ECS `@tiny-aster/core`.

---

## 8. Lo que NO Debe Desacoplarse del ECS a Corto Plazo

Las siguientes funcionalidades no deben ser desacopladas de la infraestructura actual bajo ningún escenario cercano:

1. **La Simulación de Físicas Poligonales e Inercia de Asteroids**:
   * *Razón*: Requiere la integración armónica de `MovementSystem`, `BoundarySystem`, `FrictionSystem` y `CollisionSystem2D`. Separarlos obligaría a reescribir un motor de física idéntico acoplado dentro de la carpeta del juego, rompiendo el principio de reutilización y mantenimiento de código.
2. **La Serialización de Snapshots SoA para Multiplayer**:
   * *Razón*: La optimización mediante `SnapshotSerializerSoA` para alto rendimiento y baja presión del GC está ligada a la disposición compacta en memoria del ECS. Cualquier abstracción o intermediario no orientado a datos planos de componentes deterioraría inmediatamente el rendimiento en red y degradaría el frame rate.
3. **El Sistema de Movimiento Swarm de Space Invaders**:
   * *Razón*: El movimiento en formación rígida por oleadas (`SpaceInvadersFormationSystem.ts`) requiere consultar el conjunto de posiciones de todos los invasores vivos en cada frame para calcular si se ha alcanzado el límite de pantalla. Este patrón se beneficia directamente de las consultas indexadas ultrarápidas de `world.query`, por lo que su desacoplamiento degradaría la eficiencia y legibilidad de la lógica de horda.

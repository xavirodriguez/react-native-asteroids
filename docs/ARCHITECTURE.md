# Arquitectura — react-native-asteroids
Última verificación real contra código fuente: 2025-02-21

## 1. Visión general
`react-native-asteroids` es un entorno monorepo multijuego basado en un motor de desarrollo propio súper liviano de tipo Entity Component System (ECS) llamado `TinyEngine` (o `TinyAster`). El proyecto está diseñado para funcionar en entornos móviles de alto rendimiento mediante React Native (con soporte para renderizado 2D tradicional sobre canvas HTML5/Web y alto rendimiento con Skia), y en el lado del servidor de forma headless mediante un servidor multijugador autoritativo basado en **Colyseus**.

El monorepo está estructurado utilizando workspaces de `pnpm`. El núcleo del motor reside en `@tiny-aster/core` (dentro de `packages/core`), el cual aloja las abstracciones fundamentales del ECS (`World`, `Entity`, `Component`, `System`, `Schedule`, `Query`), los sistemas físicos genéricos en 2D, de colisiones por sweep-and-prune, los snapshots compactados en Structure of Arrays (SoA) y los helpers de compresión de red. Por otro lado, la interfaz de usuario, la navegación móvil (con Expo Router), la orquestación de pantallas, los hooks polimórficos de progresión y la presentación de los minijuegos viven en la aplicación principal en la raíz de `src/`.

Esta separación permite que la simulación de juego sea 100% determinista y desacoplada del motor visual o de sonido, de manera que el servidor autoritativo de NodeJS ejecute exactamente el mismo motor físico genérico en modo headless mientras que el cliente React Native renderiza e interpola el estado con predicción local y culling espacial avanzado.

---

## 2. Motor (packages/core)

### 2.1 ECS y Gestión de Estado
El motor ECS utiliza un enfoque estricto para garantizar que los datos estén completamente separados de la lógica de procesamiento. Las mutaciones del estado de los componentes están reguladas bajo un patrón seguro para mantener la integridad de los índices del `World` e incrementar reactivamente el campo `stateVersion` para optimizaciones de red y serialización.

- **Patrón de mutación verificado:** No se permite la mutación directa de propiedades de componentes obtenidos a través de `getComponent()`, ya que esto causaría desincronizaciones en el versionado del estado físico. El acceso en lectura está protegido en modo desarrollo (`__DEV__`) mediante un congelamiento superficial de objeto (`Object.freeze()`). Para mutar un componente de forma segura, se debe utilizar obligatoriamente `mutateComponent(entity, type, mutatorFn)`, lo cual asegura que se incremente el `stateVersion` interno y se invaliden las cachés de serialización del `World`.
- **Tabla de Sistemas Core:**

| Sistema | Responsabilidad | Componentes que muta/lee | ¿Implementa dispose() real? |
| :--- | :--- | :--- | :--- |
| `JoystickSystem` | Gesta las lecturas de los joysticks virtuales de la pantalla. | Lee/Muta: `InputState` | No (Hereda no-op de `System`) |
| `SpatialCullingSystem` | Realiza el descarte fuera de viewport para optimizar bucles físicos. | Lee: `Transform`, `LocalPlayer`, `Player`. Muta: Candidatos de culling en recursos de World | Sí, realiza limpieza de recursos del World |
| `MovementSystem` | Realiza integración de Euler (posición y rotación basadas en velocidad). | Lee: `Velocity`. Muta: `Transform` | No (Hereda no-op de `System`) |
| `BoundarySystem` | Controla los límites de pantalla (envolver, rebotar o destruir entidad). | Lee: `Boundary`. Muta: `Transform`, `Velocity` | No (Hereda no-op de `System`) |
| `FrictionSystem` | Reduce de forma gradual la velocidad basándose en el coeficiente de fricción. | Lee: `Friction`. Muta: `Velocity` | No (Hereda no-op de `System`) |
| `CCDSystem` | Predice colisiones para proyectiles ultrarrápidos mediante trazado de rayos. | Lee: `Transform`, `Velocity`, `Collider`. Muta: `CollisionEvents` | No (Hereda no-op de `System`) |
| `CollisionSystem2D` | Fase broad-phase (Sweep and Prune) y narrow-phase de colisiones. | Lee: `Transform`, `Collider`. Muta: `CollisionEvents` | No (Hereda no-op de `System`) |
| `TTLSystem` | Controla el tiempo de vida (Time To Live) de las entidades efímeras. | Lee/Muta: `TTL` | No (Hereda no-op de `System`) |
| `BaseGameStateSystem` | Controla transiciones genéricas de fin de juego o niveles. | Lee/Muta: `GameState` | No (Hereda no-op de `System`) |
| `SpatialPartitioningSystem` | Registra entidades en la grilla espacial de aceleración de queries. | Lee: `Transform`. Muta: `SpatialNode` | No (Hereda no-op de `System`) |
| `LootSystem` | Gesta las probabilidades de drops de loot al destruirse un obstáculo/enemigo. | Lee: `LootTable`, `Transform`. Muta: Entidades (vía commandBuffer) | No (Hereda no-op de `System`) |
| `PowerUpSystem` | Controla la asignación y efectos de powerups recogidos en el juego. | Lee: `PowerUp`. Muta: `Health`, `Render`, `InputState` | No (Hereda no-op de `System`) |
| `ComboSystem` | Reduce y actualiza de forma continua el timer de combos de puntaje en arcade. | Lee: `Combo` (genérico). Muta: `Combo` | Sí, implementa `dispose(): void {}` |
| `JuiceSystem` | Computa interpolaciones visuales tipo squash/stretch/fade (efectos estéticos). | Lee: `Juice`. Muta: `VisualOffset`, `Render` | No (Hereda no-op de `System`) |
| `ScreenShakeSystem` | Aplica una vibración pseudoaleatoria a las coordenadas de cámara. | Lee: `ScreenShake`. Muta: `Camera2D` | No (Hereda no-op de `System`) |
| `FeedbackSystem` | Emite señales para reproducir efectos de sonido y vibración háptica. | Lee: `HapticRequest`. Muta: Recursos del sistema de Audio | No (Hereda no-op de `System`) |
| `RenderUpdateSystem` | Traduce transformaciones del motor al buffer de renderizado final. | Lee: `Transform`. Muta: `Render` | No (Hereda no-op de `System`) |
| `ReplicationSystem` | Interpola las coordenadas de red locales entre ticks autoritativos. | Lee: `RemotePlayer`. Muta: `Transform` | No (Hereda no-op de `System`) |

### 2.2 Frontera Core vs Aplicación
La regla de diseño original de `TinyEngine` establece una frontera clara: el core debe albergar única y exclusivamente lógica e interfaces independientes de cualquier juego específico. Todo el código que tenga acoplamiento directo con un juego en particular (física personalizada, flujos de puntuación especiales o tipos de datos exclusivos) debe residir fuera de `packages/core`, idealmente dentro de la aplicación consumidora (`src/games/*`) o en subpaquetes aislados en el monorepo.

**Violaciones reales detectadas en el código (Deuda Técnica de Acoplamiento Físico):**
Existe una desviación física evidente en la estructura de archivos: el minijuego **Asteroids** vive parcialmente dentro de `packages/core/src/games/asteroids`. Aunque se implementó la unificación lógica para evitar que el barrel raíz (`packages/core/src/index.ts`) re-exporte este minijuego (resolviendo el acoplamiento a nivel de importación global), el acoplamiento físico persiste puesto que las clases `AsteroidsGame`, `AsteroidCollisionSystem`, etc., siguen empaquetándose dentro del repositorio del motor. Esto viola el principio de diseño de la frontera Core vs Aplicación y se cataloga como deuda técnica física prioritaria.

---

## 3. Juegos implementados

### 3.1 Asteroids
- **ComponentRegistry propio:** Sí, definido formalmente en `packages/core/src/games/asteroids/types/AsteroidRegistry.ts` como `AsteroidsComponentRegistry`.
- **Tabla de Sistemas Propios:**

| Sistema | Eventos que escucha | Responsabilidad |
| :--- | :--- | :--- |
| `AsteroidInputSystem` | - | Convierte entradas locales o de red en aceleración de la nave e inicia disparos de proyectiles. |
| `AsteroidCollisionSystem` | - | Resuelve las colisiones destructivas entre naves, asteroides y proyectiles en base a fases de juego. |
| `AsteroidGameStateSystem` | - | Administra el flujo de vidas, puntajes, niveles y la reaparición de naves o UFOs. |

- **Desviaciones del patrón común de TinyEngine:** Vive dentro del paquete del core (`packages/core`), utilizando una estrategia de replicación de red mixta basada en buffers circulares y predicción local avanzada en el cliente.

### 3.2 Flappy Bird
- **ComponentRegistry propio:** No tiene un archivo `ComponentRegistry` formal o extendido, opera directamente sobre un tipado ad-hoc de componentes agregados sobre el Core (`BirdComponent`, `PipeComponent`, `FlappyBirdState`, etc.) definido en `src/games/flappybird/types/FlappyBirdTypes.ts`.
- **Tabla de Sistemas Propios:**

| Sistema | Eventos que escucha | Responsabilidad |
| :--- | :--- | :--- |
| `FlappyBirdInputSystem` | - | Traduce el comando "flap" o planeo en impulsos de velocidad vertical aplicados sobre el eje Y de la física del ave. |
| `FlappyBirdGlideSystem` | - | Aplica lógica de amortiguación gravitatoria cuando el ave planea de forma activa. |
| `FlappyBirdCollisionSystem` | - | Registra impactos fatales contra las tuberías de borde o el suelo y genera retroalimentación de pantalla. |
| `FlappyBirdGameStateSystem` | - | Administra la generación procedural infinita de tuberías en intervalos fijos y registra el puntaje. |
| `FlappyBirdRenderSystem` | - | Administra el renderizado específico de los sprites del ave, de las tuberías de paso y el fondo dinámico. |

- **Desviaciones del patrón común de TinyEngine:** Utiliza un scroll lateral infinito donde el ave permanece fija en el eje X y son los obstáculos (tuberías) los que se desplazan de derecha a izquierda utilizando coordenadas relativas y generación procedural.

### 3.3 Pong
- **ComponentRegistry propio:** Sí, definido en `src/games/pong/types.ts` como `PongComponentRegistry`.
- **Tabla de Sistemas Propios:**

| Sistema | Eventos que escucha | Responsabilidad |
| :--- | :--- | :--- |
| `PongInputSystem` | - | Gestiona el movimiento de las paletas de ambos lados (W/S para Player 1 y Flechas para Player 2) o activa la inteligencia artificial adaptativa de nivel de dificultad medio. |
| `PongSpinSystem` | - | Añade fuerza rotatoria y un factor de "spin" a la bola tras golpear una paleta en movimiento, alterando su ángulo de rebote físico. |
| `PongVelocityGuardrailSystem` | - | Mantiene la velocidad de la bola dentro de límites seguros de simulación para prevenir que atraviese colisionadores por velocidades extremas. |
| `PongCollisionSystem` | - | Administra los rebotes físicos de la bola contra las paletas y los límites horizontales/verticales del juego. |
| `PongGameStateSystem` | - | Determina los puntos ganados, reinicia la bola tras anotaciones y maneja la transición de victoria de set. |

- **Desviaciones del patrón común de TinyEngine:** Implementa lógica de predicción de colisiones adaptada a paletas dinámicas y cuenta con un sistema de inteligencia artificial simple integrado dentro del input system local.

### 3.4 Space Invaders
- **ComponentRegistry propio:** No tiene un ComponentRegistry extendido formal, opera definiendo interfaces de componentes (`InvaderComponent`, `FormationComponent`, `ShieldComponent`, etc.) en `src/games/space-invaders/types/SpaceInvadersTypes.ts` que se acoplan en la simulación del World.
- **Tabla de Sistemas Propios:**

| Sistema | Eventos que escucha | Responsabilidad |
| :--- | :--- | :--- |
| `SpaceInvadersInputSystem` | - | Mapea las flechas de dirección lateral para la nave y el disparo de proyectiles contra la formación enemiga. |
| `SpaceInvadersFormationSystem` | - | Controla la marcha en bloque de los invasores, gestionando la velocidad incremental a medida que quedan menos enemigos, el cambio de dirección lateral y el descenso vertical acumulativo. |
| `KamikazeSystem` | - | Activa e inicia el descenso libre y errático de invasores individuales en modo kamikaze directo contra el jugador. |
| `BossSystem` | - | Administra la aparición de naves nodrizas especiales en la parte superior con patrones de disparo independientes. |
| `InvulnerabilitySystem` | - | Reduce el tiempo de invulnerabilidad temporal del jugador tras recibir impactos para evitar penalizaciones inmediatas de vida. |
| `SpaceInvadersCollisionSystem` | - | Resuelve las colisiones destructivas de proyectiles del jugador y enemigos contra invasores, escudos destruibles y la nave local. |
| `SpaceInvadersGameStateSystem` | - | Controla las vidas, el avance de niveles, la carga y expiración del multiplicador de combos rápidos. |
| `SpaceInvadersRenderSystem` | - | Orquesta los efectos de visualización de los proyectiles y animaciones de invasores en pantalla. |

- **Desviaciones del patrón común de TinyEngine:** Gesta un multiplicador de combos acelerado basado en intervalos de tiempo sumamente cortos de eliminación consecutiva, y un colisionador segmentado de escudos en el que cada pixel/segmento tiene puntos de vida independientes.

---

## 4. Multijugador (Colyseus)

### 4.1 Estado de replicación y determinismo
El componente multijugador implementado mediante Colyseus en `server/` corre una simulación de juego headless de Asteroids de forma autoritativa.
- **Autoridad del Servidor:** El servidor procesa todos los inputs de entrada que los clientes envían etiquetados con un `tick` de simulación específico. El servidor simula la física a pasos fijos de `16.66 ms` y propaga periódicamente el estado unificado a los clientes.
- **Predicción y Reconciliación en el Cliente:** El cliente realiza predicciones de movimiento local de forma inmediata aplicando sus inputs instantáneos. Al recibir el snapshot de red del servidor autoritativo, el cliente contrasta su historial local y realiza un "rollback" y re-simulación de ticks para coincidir exactamente con el estado del servidor si se detectan divergencias.
- **Culling de Red y Preservación de buffers binarios SoA:** Para mitigar problemas de ancho de banda, se implementó el formato Structure of Arrays (SoA). A través de `msgpackr` (instanciado con `{ useRecords: false, structuredClone: true }`), el formato SoA de arrays de tipos (`TypedArrays` como `Int32Array` y `Float64Array`) se empaqueta de forma directa en binario sin pasar por serializaciones JSON intermedias, preservando la continuidad de la memoria en la capa de transporte de Colyseus.

### 4.2 Puntos de fricción analizados
- **Rollback en Entidades No Numéricas:** Dado que el rollback requiere reconstruir el estado idéntico de entidades dinámicas como proyectiles o efectos efímeros, la serialización SoA almacena en arrays de soporte no numéricos los datos no booleanos/numéricos. El coste de recolectar y reconstruir estas propiedades puede aumentar la presión sobre el Garbage Collector si no se controla adecuadamente la tasa de ticks de re-simulación.
- **Latencia de Red vs Estabilidad Física:** En situaciones de alta latencia o pérdida de paquetes continuos, el cliente acumula demasiados ticks de re-simulación local, lo que puede provocar pequeños tirones ("teletransportaciones") en la nave del jugador si la reconciliación se desfasa demasiado del tick actual de renderizado.

---

## 5. Historial de Discrepancias Detectadas
A través de la presente auditoría física ciega contra el código fuente, se identificaron y catalogaron las siguientes contradicciones y desviaciones respecto a documentos previos e históricos del proyecto:

1. **Ubicación del Código de Asteroids (Monorepo vs Core):**
   - *Declaración de Diseño previa:* Se estableció en tareas arquitectónicas previas (ej. Task 6 en `docs/TODO.md`) que el minijuego de Asteroids debía ser completamente desacoplado y extraído del barrel de exportaciones raíz de `@tiny-aster/core` para que el motor genérico no tuviera dependencias ni conocimiento de ningún juego específico.
   - *Estado Físico real:* Aunque el barrel raíz de core (`packages/core/src/index.ts`) ya no exporta directamente las clases e interfaces de Asteroids, el código del juego Asteroids sigue residiendo físicamente dentro del subdirectorio `packages/core/src/games/asteroids/` (en lugar de estar en `src/games/` junto a los demás títulos o en un paquete separado del monorepo).
   - *Impacto:* El motor sigue conteniendo código de producción específico, lo cual ralentiza su empaquetado independiente y propicia regresiones de acoplamiento.

2. **Terminología de Sistemas de Combos (Lógico vs Físico):**
   - *Declaración en Documentos históricos (BUG-001, KNOWN_ISSUES.md):* Se hace referencia constante al sistema `AsteroidsComboSystem` como el responsable de la acumulación de listeners y reinicios.
   - *Estado Físico real:* El sistema de combos implementado en el monorepo es genérico y se denomina simplemente `ComboSystem` (residiendo bajo `packages/core/src/games/arcade/systems/ComboSystem.ts`). No existe ningún sistema físico llamado `AsteroidsComboSystem` en el monorepo.

3. **Inexistencia de Configuración JSON Activa para Asteroids:**
   - *Código de simulación:* `AsteroidsGame.ts` importa de manera estricta el archivo de configuración `require("./config/asteroids.json")` para cargar los valores por defecto del viewport y dinámicas de naves.
   - *Estado Físico real:* El archivo `packages/core/src/games/asteroids/config/asteroids.json` está vacío (`{}`), obligando a que la simulación dependa completamente del esquema por defecto de `AsteroidConfigSchema` y sus fallbacks si no hay mutadores activos.

4. **Métodos de Limpieza de Sistemas (destroy vs dispose):**
   - *Declaración genérica de ciclo de vida:* En múltiples notas históricas se describe que la limpieza de sistemas se realiza mediante métodos `destroy()`.
   - *Estado Físico real:* La firma base de la clase abstracta `System` define únicamente `dispose(): void {}` como punto de entrada para la liberación y desregistro de recursos. Los sistemas heredados que implementan limpieza siguen esta firma, no `destroy()`.

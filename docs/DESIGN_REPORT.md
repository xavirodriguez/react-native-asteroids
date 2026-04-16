# Informe de Diseño Creativo: TinyAsterEngine Arcade Suite
**Director de Diseño Creativo:** Jules

## 1. Visión General

El proyecto TinyAsterEngine cuenta con una base sólida de juegos arcade clásicos implementados con una arquitectura ECS limpia y eficiente sobre React Native + Expo. Actualmente, los juegos (Asteroids, Flappy Bird, Pong y Space Invaders) cumplen con las mecánicas fundamentales "BY THE BOOK", pero carecen de una identidad distintiva, una capa de pulido ("juice") profunda y sistemas de progresión que incentiven la retención a largo plazo.

Nuestra meta es transformar estas implementaciones técnicas en experiencias memorables, aplicando los principios de *Level Up!* de Scott Rogers para mejorar el "Game Feel", la claridad sistémica y la rejugabilidad.

---

## 2. Diagnóstico por Juego

### Asteroids
*   **Fantasía del jugador:** Piloto solitario en un cinturón de asteroides hostil.
*   **Loop principal:** Rotar, acelerar, disparar, destruir asteroides y esquivar fragmentos.
*   **Fortalezas:** Control inercial bien implementado, uso de partículas en explosiones y screen shake básico.
*   **Debilidades:** Identidad visual genérica, falta de variedad en el armamento y ritmo monótono.
*   **Mayor Oportunidad:** Introducir un sistema de "Power-ups tácticos" y una progresión visual del daño.

### Flappy Bird
*   **Fantasía del jugador:** Sobrevivir a un vuelo acrobático precario.
*   **Loop principal:** Flap, controlar altura por gravedad, pasar por huecos.
*   **Fortalezas:** Mecánica base funcional y loop de reintento rápido.
*   **Debilidades:** Feedback casi inexistente (el pájaro no reacciona al flap visualmente más allá del movimiento), entorno estático, falta de "juice".
*   **Mayor Oportunidad:** Convertirlo en un juego de "vuelo con expresión", añadiendo feedback de estela, animaciones reactivas y obstáculos dinámicos.

### Pong
*   **Fantasía del jugador:** Duelo de reflejos de alta intensidad.
*   **Loop principal:** Posicionar la pala, interceptar la bola, devolver con ángulo.
*   **Fortalezas:** IA funcional con niveles y soporte para multijugador.
*   **Debilidades:** Es el juego más "seco" visualmente. No hay sensación de impacto cuando la bola golpea la pala o las paredes.
*   **Mayor Oportunidad:** "Impacto Kinético". Añadir deformación de palas (squash & stretch), ráfagas de partículas direccionales en impactos y una "Bola de Fuego" cuando la velocidad sube.

### Space Invaders
*   **Fantasía del jugador:** Última línea de defensa contra una invasión implacable.
*   **Loop principal:** Movimiento horizontal, disparo rítmico, cobertura tras escudos.
*   **Fortalezas:** Sistema de formación y niveles bien estructurado, uso de escudos destruibles.
*   **Debilidades:** Pacing demasiado rígido y predecible. La amenaza se siente mecánica pero no orgánica.
*   **Mayor Oportunidad:** "Escalada de Tensión". Introducir tipos de enemigos con comportamientos únicos (suicidas, tanques) y recompensas por "Chain Kills".

---

## 3. Propuestas de Mejora por Juego

### Asteroids

#### [Propulsores de Fusión Estelar]
**Tipo:** Feel
**Coste:** Low
**Impacto:** Medio

**Qué es**
Añadir una estela de partículas persistente que cambie de color y tamaño según la velocidad actual de la nave. Al activar el "Thrust", se genera una explosión inicial de partículas azuladas que transicionan a blanco.

**Qué problema resuelve**
La falta de feedback sobre la aceleración. Actualmente, es difícil "sentir" la inercia sin mirar la posición relativa.

**Por qué mejora el juego**
Aumenta el "Juice" y hace que el simple acto de moverse sea visualmente gratificante (Principio de "Moving should be fun").

**Cómo se sentiría para el jugador**
El jugador siente que tiene un motor potente bajo su mando, no solo un triángulo deslizándose.

**Riesgos o trade-offs**
Sobrecarga visual si hay demasiadas naves (en multijugador). Se debe limitar el TTL de las partículas.

#### [Sistema de Armamento Modular]
**Tipo:** Sistema / Contenido
**Coste:** Medium
**Impacto:** Alto

**Qué es**
Introducir 3 tipos de disparos que aparecen como Power-ups al destruir asteroides grandes:
1. **Disparo Triple:** Cobertura frontal amplia.
2. **Cañón de Plasma:** Bala más lenta pero que atraviesa dos asteroides.
3. **Misiles de Seguimiento:** Buscan el fragmento más cercano (ideal para limpiar "smalls").

**Qué problema resuelve**
La monotonía del combate de un solo proyectil y la falta de "picos de poder".

**Por qué mejora el juego**
Añade profundidad estratégica. El jugador debe decidir cuándo usar cada arma según la densidad de asteroides.

**Cómo se sentiría para el jugador**
Momentos de "Empoderamiento" (Power Fantasy) seguidos de vulnerabilidad cuando el power-up expira.

**Riesgos o trade-offs**
Requiere ajustar la dificultad de las oleadas para no hacer el juego demasiado fácil.

---

### Flappy Bird

#### [Ángulo de Ataque Dinámico]
**Tipo:** Feel / UX
**Coste:** Low
**Impacto:** Alto

**Qué es**
Inclinar visualmente el pájaro según su velocidad vertical. Si sube (tras un flap), mira hacia arriba (~30°). Si cae, pica hacia abajo (~60°).

**Qué problema resuelve**
La "rigidez" del personaje. Actualmente el pájaro es un sprite/forma estática que sube y baja.

**Por qué mejora el juego**
Proporciona feedback inmediato sobre el estado físico del personaje sin mirar el HUD. Mejora la lectura del juego (Readability).

**Cómo se sentiría para el jugador**
Una sensación de mayor control y conexión orgánica con el personaje.

**Riesgos o trade-offs**
Si la rotación es demasiado brusca, puede distraer. Requiere un suavizado (lerp) en la rotación.

#### [Ecosistema Reactivo]
**Tipo:** Contenido
**Coste:** Medium
**Impacto:** Medio

**Qué es**
Añadir elementos en el fondo que reaccionen al paso del pájaro: nubes que se dispersan, hojas que vuelan, o incluso otros pájaros que huyen.

**Qué problema resuelve**
El entorno estático que hace que el juego se sienta "muerto" tras unos segundos.

**Por qué mejora el juego**
Crea un mundo vivo. Según Rogers en *Level Up!*, el mundo debe contar una historia o al menos reaccionar al jugador.

**Cómo se sentiría para el jugador**
Mayor inmersión y sensación de velocidad.

**Riesgos o trade-offs**
No debe interferir con la legibilidad de los tubos (obstáculos principales).

---

### Pong

#### [Impacto Kinético (Squash & Stretch)]
**Tipo:** Feel
**Coste:** Low
**Impacto:** Alto

**Qué es**
La bola se aplasta horizontalmente al golpear una pala y se estira en la dirección de su movimiento. La pala vibra lateralmente y cambia de color momentáneamente tras el impacto.

**Qué problema resuelve**
La falta de "impacto". Actualmente, el rebote es puramente matemático y frío.

**Por qué mejora el juego**
Añade "Juicy feedback". El jugador siente la fuerza de la bola.

**Cómo se sentiría para el jugador**
Cada golpe se siente físico y satisfactorio.

**Riesgos o trade-offs**
Si es exagerado, puede afectar a la precisión percibida del collider.

#### [Carga de Super-Golpe]
**Tipo:** Sistema
**Coste:** Medium
**Impacto:** Transformador

**Qué es**
Si el jugador golpea la bola con el borde de la pala mientras se mueve, la bola se "carga" (fuego/electricidad) y viaja un 20% más rápido con una trayectoria curva.

**Qué problema resuelve**
La falta de un "Skill Ceiling" (techo de habilidad) elevado.

**Por qué mejora el juego**
Introduce una mecánica de Riesgo vs Recompensa. Intentar un super-golpe es arriesgado pero puede dar el punto.

**Cómo se sentiría para el jugador**
Un momento de "Dominancia" táctica.

---

### Space Invaders

#### [Cadena de Combo y Multiplicador]
**Tipo:** Sistema
**Coste:** Low
**Impacto:** Medio

**Qué es**
Un HUD que muestra un contador de "Combo". Cada acierto sin fallar un disparo aumenta el multiplicador de puntos. Al llegar a x5, los disparos del jugador son dobles por 3 segundos.

**Qué problema resuelve**
La falta de incentivo para la precisión. Actualmente, disparar al aire no tiene penalización real.

**Por qué mejora el juego**
Crea un loop de "Flow". El jugador se concentra en no fallar, aumentando la tensión y la satisfacción.

**Cómo se sentiría para el jugador**
Una danza rítmica de disparos precisos.

**Riesgos o trade-offs**
Puede frustrar a jugadores novatos si el combo se pierde demasiado fácil.

#### [Jefes de Escuadrón (Minibosses)]
**Tipo:** Contenido / Sistema
**Coste:** High
**Impacto:** Transformador

**Qué es**
Cada 3 oleadas, aparece un "Nave Nodriza" de combate que no solo pasa por arriba, sino que desciende y tiene patrones de disparo circulares o láseres zonales.

**Qué problema resuelve**
La repetitividad intrínseca de Space Invaders.

**Por qué mejora el juego**
Proporciona "Hitos" (Milestones) claros en la partida. Rompe el ritmo de "limpiar filas" con un desafío de "esquiva y apunta".

**Cómo se sentiría para el jugador**
Un clímax de tensión emocional antes de un momento de descanso (intermisión).

**Riesgos o trade-offs**
Alto coste de desarrollo (IA nueva, patrones, arte).

---

## 4. Ideas Transversales para todo el proyecto

### [El "Arcade Mastery" Layer]
**Tipo:** Meta-Sistema
**Coste:** Medium
**Impacto:** Transformador

**Qué es**
Un sistema de progresión global que otorga "XP de Jugador" por acciones en cualquier juego (ej. destruir 100 asteroides, pasar 50 tubos). Subir de nivel desbloquea:
1. **Paletas de colores retro** (GameBoy style, CRT Amber, etc.) para todos los juegos.
2. **Logros integrados** que se muestran como pop-ups in-game.
3. **Modificadores de juego** (Gravity Flip, Speed Run mode).

### [Unified Juice Library]
**Tipo:** Arquitectura / Feel
**Coste:** Medium
**Impacto:** Alto

**Qué es**
Centralizar sistemas de feedback como `ChromaticAberrationSystem`, `GhostTrailSystem` y `ImpactPauseSystem` (Hit-stop) para que puedan ser activados en cualquier juego con un simple tag en la entidad.

---

## 5. Top Prioridades (Quick Wins)

1.  **Ángulo de Ataque en Flappy Bird:** Cambio visual enorme con esfuerzo mínimo.
2.  **Impacto Kinético en Pong:** Transforma la sensación de un juego frío a uno vibrante.
3.  **Propulsores en Asteroids:** Mejora el Game Feel básico del movimiento.
4.  **Sistema de Combo en Space Invaders:** Introduce profundidad mecánica sin nuevos assets.

---

## 6. Apuestas locas pero prometedoras

### [Asteroids: Rogue-Lite Edition]
Convertir el loop de Asteroids en una "Run" donde cada oleada limpiada permite elegir entre 3 mejoras permanentes (ej. +10% velocidad de giro, balas que rebotan, escudo frontal). Transforma un arcade de 2 minutos en una experiencia de 20 minutos con decisiones tácticas.

### [Pong: Bullet Hell Mode]
A medida que el score sube, la bola empieza a "soltar" pequeñas balas que los jugadores deben esquivar mientras intentan golpear la bola principal. Cruce de géneros disruptivo.

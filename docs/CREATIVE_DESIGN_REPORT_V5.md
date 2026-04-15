# Informe de Diseño Creativo V5: El Despertar del Arcade
**Director de Diseño Creativo:** Jules
**Marco de Trabajo:** *Level Up!* (Scott Rogers) & Design Strategy V4

---

## 1. Visión General: "The Living Arcade"
Nuestra meta es elevar la experiencia de juego de "clones funcionales" a **"clásicos reinventados"**. Siguiendo las lecciones de Scott Rogers, nos enfocamos en que cada interacción tenga peso, que el mundo reaccione al jugador y que la curva de aprendizaje sea una escalera de dopamina, no un muro de frustración.

En esta versión V5, introducimos el concepto de **"Simbiosis de Sistemas"**: donde el éxito en una mecánica (ej. precisión en el disparo) alimenta visual y mecánicamente otra (ej. movilidad o poder destructivo).

---

## 2. Diagnóstico de la Flota

### [Asteroids] — "La Danza en el Vacío"
*   **Fortalezas:** Control inercial muy pulido; la fragmentación de asteroides es satisfactoria.
*   **Debilidades:** El espacio se siente vacío; falta de "objetivos secundarios" durante el combate.
*   **Oportunidad:** Transformarlo en un juego de **dominio del entorno**.

### [Flappy Bird] — "Estilo sobre Supervivencia"
*   **Fortalezas:** Mecánica de "Glide" (planeo) añade una dimensión técnica única.
*   **Debilidades:** La muerte es súbita y seca; el HUD es demasiado estático.
*   **Oportunidad:** Fomentar el **"Flow State"** mediante el riesgo.

### [Pong] — "Duelo de Precision"
*   **Fortalezas:** El sistema de "Spin" funciona bien técnicamente.
*   **Debilidades:** Falta de clímax; los intercambios largos pueden volverse monótonos.
*   **Oportunidad:** Romper la simetría y crear **"momentos de poder"**.

### [Space Invaders] — "El Asalto Táctico"
*   **Fortalezas:** IA de formación estable y sistemas de Kamikaze/Boss ya implementados.
*   **Debilidades:** Lectura visual en momentos de alta densidad de balas; falta de feedback de combo.
*   **Oportunidad:** Mejorar la **claridad sistémica** y la jerarquía de amenazas.

---

## 3. Propuestas de Mejora por Juego

### [Asteroids]

#### A. Kinetic Echoes (Estelas de Velocidad Reactivas)
*   **Tipo:** Feel / Juice | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** La estela de la nave no solo muestra dónde estuviste, sino cómo te mueves. Si superas el 80% de velocidad máxima, la estela se vuelve azul eléctrico y emite chispas.
*   **Por qué:** Recompensa visualmente el uso agresivo del empuje (Rogers: "Feedback visual constante").

#### B. Gravitational Singularities (Anomalías de Campo)
*   **Tipo:** Sistema / Obstáculo | **Coste:** Medium | **Impacto:** Alto
*   **Qué es:** Pequeños agujeros negros o púlsares que aparecen aleatoriamente. Atraen la nave y las balas, curvando su trayectoria.
*   **Problema:** Rompe la monotonía del movimiento lineal. Obliga a recalcular ángulos de disparo.
*   **Riesgo:** Puede frustrar si la fuerza de atracción es demasiado fuerte y no hay aviso visual claro.

#### C. Weapon Evolution (Power-ups Dinámicos)
*   **Tipo:** Contenido | **Coste:** Medium | **Impacto:** Alto
*   **Qué es:** Al destruir un UFO, este suelta un núcleo. Si lo recoges, tu arma cambia durante 10 segundos: **Burst Fire** (3 balas en abanico) o **Railgun** (atraviesa asteroides pequeños).

---

### [Flappy Bird]

#### A. Near-Miss Style Points (Puntos de Estilo)
*   **Tipo:** Sistema | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Pasar a menos de 5px de un tubo sin chocar otorga un multiplicador de puntuación instantáneo ("¡NICHE!"). Visualmente se indica con un destello blanco y un "pop" de partículas.
*   **Por qué:** Convierte el miedo al fallo en una oportunidad de maestría.

#### B. Environmental Wind (Corrientes de Viento)
*   **Tipo:** Sistema | **Coste:** Medium | **Impacto:** Medio
*   **Qué es:** Zonas indicadas por partículas de aire que empujan al pájaro. Viento ascendente (ayuda a subir) y descendente (te obliga a aletear más rápido).
*   **Riesgos:** Requiere que el jugador aprenda a leer las partículas antes de entrar en la zona.

#### C. Coyote Flight (Perdón Mecánico)
*   **Tipo:** Control | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Permitir un último aleteo justo un frame después de tocar el suelo, evitando el Game Over inmediato si reaccionas a tiempo.

---

### [Pong]

#### A. Adaptive Arena: "The Wall"
*   **Tipo:** Ambiciosa | **Coste:** Medium | **Impacto:** Transformador
*   **Qué es:** Tras cada punto, un muro de ladrillos destruibles (tipo Breakout) aparece en el centro o se desplaza.
*   **Por qué:** Crea ángulos de rebote impredecibles y obliga a los jugadores a "limpiar" el camino antes de atacar.

#### B. Perfect Parry (Parada Perfecta)
*   **Tipo:** Sistema | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Golpear la bola en el último momento posible antes de que toque la pala carga la bola con fuego, aumentando su velocidad un 40% hasta que el otro jugador la devuelva.

---

### [Space Invaders]

#### A. Bullet Grazing (Rozar Balas)
*   **Tipo:** Sistema | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Estar muy cerca de balas enemigas llena una barra de "Overdrive". Al llenarse, el siguiente disparo es un misil buscador.
*   **Por qué:** Fomenta un estilo de juego arriesgado y emocionante.

#### B. Threat Highlighting 2.0
*   **Tipo:** UX / Claridad | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Los proyectiles enemigos tienen un brillo que cambia de color según su proximidad al jugador (Verde -> Amarillo -> Rojo peligro).

---

## 4. Ideas Transversales (The Unified Arcade)

### A. Cinematic Camera Director (V5)
Un sistema de cámara inteligente que:
1.  **Zoom-in:** Cuando hay pocos enemigos (duelo final).
2.  **Zoom-out:** Cuando la pantalla se llena de proyectiles.
3.  **Dutch Tilt:** Un ligero ladeo de la cámara cuando la vida está al 10%.

### B. Global Hype Meter
Un recurso compartido. Las acciones de "estilo" en cualquier juego llenan el Hype Meter. Al llegar al 100%, el juego entra en "Golden Age": todos los colores se vuelven dorados y la música sube de tempo.

### C. Unified Feedback Library
Crear un estándar de `Juice.impact()` que combine:
- Screenshake (intensidad proporcional al daño).
- Frame Freeze (1-2 frames en impactos críticos).
- Particle Burst (usando el PaletteSystem para colores coherentes).

---

## 5. Top 10 Prioridades de Producción

1.  **Near-Miss System (Flappy):** Máximo impacto con mínimo código.
2.  **Cinematic Camera Director:** Eleva el valor de producción de todos los juegos.
3.  **Perfect Parry (Pong):** Introduce profundidad competitiva inmediata.
4.  **Threat Highlighting (Invaders):** Resuelve problemas de claridad visual.
5.  **Weapon Nuclei (Asteroids):** Añade variedad táctica al loop de combate.
6.  **Coyote Time (Universal):** Mejora la sensación de "juego justo".
7.  **Dynamic Wind (Flappy):** Añade profundidad ambiental.
8.  **Bullet Grazing (Invaders):** Recompensa el juego agresivo.
9.  **Golden Age Mode:** Meta-objetivo emocionante.
10. **Impact Sound Design:** Pulir el SFX reactivo.

---

## 6. Apuestas Locas (The Moonshots)

### "The Glitch Event"
Un evento raro donde, por 5 segundos, la física de un juego se aplica a otro. Ej: Los asteroides empiezan a caer con gravedad de Flappy Bird, o la nave de Asteroids puede disparar a los tubos para romperlos.

### "Arcade Soul" (Meta-Narrativa)
Un sistema de progresión donde no solo subes de nivel, sino que desbloqueas la "historia" de las máquinas arcade, con una estética que evoluciona de 1-bit a 16-bit.

---
*Fin del Informe de Diseño Creativo V5.*

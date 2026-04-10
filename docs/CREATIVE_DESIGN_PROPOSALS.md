# Propuesta de Dirección Creativa: "Arcade Evolution"
**Director:** Jules (Creative Game Design Director)
**Fecha:** Octubre 2023
**Inspiración:** *Level Up!* (Scott Rogers)

## 1. Visión General
Tras analizar la suite de juegos actual (Asteroids, Flappy Bird, Pong, Space Invaders), el proyecto presenta un motor ECS sólido y funcional, pero con una ejecución de diseño "clásica" que prioriza la corrección técnica sobre la experiencia emocional. El potencial reside en transformar estos clones genéricos en experiencias con identidad propia mediante la aplicación de **Juice**, **Depth** y **Mastery Layers**.

---

## 2. Diagnóstico por Juego

### Asteroids: El Vacío Inerte
*   **Qué funciona:** La física de inercia y el wrap de pantalla.
*   **Qué falta:** Feedback de potencia. La nave no se siente como una máquina de propulsión.
*   **Oportunidad:** Convertir la navegación en un placer sensorial (Moving is fun).

### Flappy Bird: Vuelo Mecánico
*   **Qué funciona:** El loop de frustración/reintento.
*   **Qué falta:** Expresión física. El pájaro no reacciona al aire ni a la gravedad visualmente.
*   **Oportunidad:** "Vuelo Orgánico". Añadir rotaciones por velocidad y estelas.

### Pong: El Duelo Frío
*   **Qué funciona:** La IA y el multijugador.
*   **Qué falta:** Sensación de impacto. Los rebotes son cambios de vector instantáneos sin peso.
*   **Oportunidad:** "Impacto Kinético". Transmitir la transferencia de energía entre bola y pala.

### Space Invaders: La Defensa Monótona
*   **Qué funciona:** La formación clásica y los escudos destruibles.
*   **Qué falta:** Pacing dinámico. La amenaza es demasiado previsible de principio a fin.
*   **Oportunidad:** "Escalada de Tensión". Introducir picos de dificultad y recompensas por precisión.

---

## 3. Propuestas de Mejora por Juego

### Asteroids

#### [Propulsores de Fusión Estelar]
**Tipo:** Feel | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Partículas de estela que escalan en color (azul -> blanco) y longitud según la velocidad.
*   **Problema:** Falta de feedback sobre la inercia acumulada.
*   **Mejora:** El jugador "siente" la potencia de los motores, facilitando el control intuitivo.

#### [Armamento Modular]
**Tipo:** Sistema | **Coste:** Medium | **Impacto:** Alto
*   **Qué es:** Drops de asteroides grandes que otorgan temporalmente: Triple Shot (cobertura), Plasma Rail (atraviesa 2 enemigos) o Seeker Missiles.
*   **Problema:** El combate es plano y monótono.
*   **Mejora:** Introduce "Power Fantasy" y decisiones tácticas sobre qué arma recoger.

### Flappy Bird

#### [Ángulo de Ataque Dinámico]
**Tipo:** Feel | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Rotación del sprite basada en `velocityY` (mirar arriba al saltar, picar hacia abajo al caer).
*   **Problema:** El personaje es visualmente estático.
*   **Mejora:** Proporciona una lectura clara del estado físico sin mirar el HUD.

#### [Ráfagas de Vuelo (Speed Lines)]
**Tipo:** Feel | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Líneas de velocidad en los bordes de la pantalla cuando el pájaro está en caída libre.
*   **Problema:** Falta de sensación de peligro en la caída.

### Pong

#### [Squash & Stretch de Impacto]
**Tipo:** Feel | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Deformación de la bola y vibración de la pala en el frame de colisión usando `JuiceSystem`.
*   **Problema:** Rebotes matemáticos sin peso.
*   **Mejora:** Hace que el juego se sienta físico y satisfactorio.

#### [Carga de Super-Golpe]
**Tipo:** Sistema | **Coste:** Medium | **Impacto:** Transformador
*   **Qué es:** Si la pala se mueve al impactar, la bola se carga (VFX de electricidad) y viaja un 15% más rápido con una curva ligera.
*   **Problema:** Skill ceiling bajo.
*   **Mejora:** Premia el posicionamiento activo y el timing agresivo.

### Space Invaders

#### [Combo Meter & Precision Bonus]
**Tipo:** Sistema | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Multiplicador que aumenta con cada acierto. Fallar un tiro reinicia el combo. A x10, el disparo es doble.
*   **Problema:** Disparar al azar no tiene penalización.
*   **Mejora:** Incentiva la precisión y crea un "Estado de Flow".

#### [Escuadrón de Élite (Minibosses)]
**Tipo:** Contenido | **Coste:** High | **Impacto:** Transformador
*   **Qué es:** Naves que rompen la formación y realizan ataques en picado o disparos laterales.
*   **Problema:** La formación es demasiado estática.
*   **Mejora:** Genera picos de adrenalina y rompe la monotonía del "limpiar filas".

---

## 4. Ideas Transversales (The Arcade Foundation)

### [Mastery Layer (Global XP)]
Utilizar el `XPSystem` existente para crear una economía de meta-progresión.
*   **Logros:** "Sharpshooter" (10 kills seguidos), "Near Miss" (esquivar por 5px).
*   **Desbloqueos:** Filtros CRT, paletas de colores (GameBoy, VirtualBoy) mediante el `PaletteSystem`.

### [Unified Juice Hub]
Crear un componente `ImpactFeedback` que centralice:
*   **Hit Stop:** Congelar el tiempo 3-5 frames en grandes impactos.
*   **Chromatic Aberration:** Un pulso visual en explosiones.

---

## 5. Top Prioridades (Quick Wins)
1.  **Rotación en Flappy Bird:** Máximo impacto visual por mínimo código.
2.  **Squash & Stretch en Pong:** Vital para la sensación de juego físico.
3.  **Partículas de propulsión en Asteroids:** Mejora el loop principal (movimiento).

---

## 6. Apuestas Locas

### Asteroids: The Rogue-Runner
Transformar el juego en una "Run" donde cada oleada ofrece 3 mutadores (ej. "Balas rebotan", "Doble escudo pero mitad de velocidad"). Convierte un arcade de 2 minutos en una experiencia de progresión profunda.

### Pong: Bullet Duel
La bola "suelta" balas en direcciones aleatorias al ser golpeada con mucha fuerza. Los jugadores deben esquivar proyectiles mientras mantienen el rally de la bola principal.

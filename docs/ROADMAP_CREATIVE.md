# 🎨 ROADMAP CREATIVO & AUDITORÍA DE DISEÑO
**Dirección de Diseño de Videojuegos — TinyAsterEngine & Minijuegos**

Actuando como el **Creative Game Design Director**, y aplicando rigurosamente las lecciones maestras de ***Level Up! The Guide to Great Video Game Design* de Scott Rogers**, se presenta esta auditoría de diseño, diagnóstico de minijuegos, propuestas de mejora e ideas transversales para llevar el monorepo TinyAsterEngine al siguiente nivel de excelencia jugable, retención y pulido ("juiciness").

---

## 1. VISIÓN GENERAL

El proyecto **React Native Asteroids** cuenta con una base de ingeniería y arquitectura extraordinariamente robusta. La separación de responsabilidades a través de un motor ECS estricto y de alto rendimiento, junto con renderizadores duales en Canvas y Skia, proporciona un lienzo inigualable para la expresión creativa.

Sin embargo, para pasar de ser "demos técnicas impecables" a "videojuegos arcade altamente adictivos y pulidos", se requiere aplicar un diseño centrado en el jugador. El foco principal de este Roadmap es perfeccionar la tríada **C.C.C. (Character, Camera, Controls)**, afinar la curva de dificultad mediante tutorialización invisible, amplificar el feedback audiovisual ("game feel") e integrar capas enriquecidas de progresión meta-juego.

---

## 2. DIAGNÓSTICO DETALLADO POR JUEGO

### 🎮 ASTEROIDS
* **Fantasía del jugador**: Un piloto solitario de caza espacial esquivando peligros gravitatorios e intentando sobrevivir a una tormenta interminable de meteoros mediante reflejos puros de inercia espacial.
* **Qué funciona muy bien**: El control físico de inercia y fricción se siente fluido y fiel al arcade clásico de Vector-graphics. El sistema de colisiones con CCD previene comportamientos anómalos o "fantasmas" a alta velocidad.
* **Qué falta / Oportunidades**: Falta de anticipación ("telegraphed danger") cuando un asteroide grande se fragmenta o entra a la pantalla. El disparo se siente plano visualmente, y falta tensión en las decisiones de riesgo-recompensa (p. ej. hiperspacio).

### 🎮 SPACE INVADERS
* **Fantasía del jugador**: Defensor planetario deteniendo una invasión robótica descendente milimétrica y sincronizada bajo un asedio de balas pesadas.
* **Qué funciona muy bien**: La lógica de formación rígida y el descenso rítmico están bien coordinados. Las barreras destructibles ofrecen un resguardo táctico valioso.
* **Qué falta / Oportunidades**: El ritmo ("pacing") de disparo es demasiado plano. Falta una sensación de "frenesí" cuando quedan pocos enemigos. La destrucción de escudos e invasores carece de fragmentación ("debris") visual para enfatizar el impacto.

### 🎮 FLAPPY BIRD
* **Fantasía del jugador**: El reto hiper-casual masoquista de precisión milimétrica donde el mínimo roce resulta en una derrota rotunda.
* **Qué funciona muy bien**: La acumulación de gravedad se siente pesada e instantánea, crucial para la precisión del salto ("flap"). El ritmo de paso por las tuberías es constante.
* **Qué falta / Oportunidades**: Onboarding deficiente para nuevos jugadores (pico inicial de frustración abrupto). Carece de feedback visual de viento/estelas que enfatice la velocidad de caída o la potencia del aleteo.

### 🎮 PONG
* **Fantasía del jugador**: El duelo minimalista definitivo de reflejos rápidos, control de ángulos y predicción psicológica de la trayectoria de la bola.
* **Qué funciona muy bien**: El rebote es predecible y preciso. Las físicas responden perfectamente en tiempo de ejecución.
* **Qué falta / Oportunidades**: Es excesivamente simétrico y monótono tras unos minutos. No hay transferencia de inercia de la pala a la bola (p. ej. si golpeas moviendo la pala rápido, la bola debería salir más veloz o con efecto).

---

## 3. PROPUESTAS DE MEJORA DETALLADAS POR JUEGO

---

### 🚀 MEJORAS PARA ASTEROIDS

#### 1. Inercia de Disparo y Retroceso Mecánico
* **Tipo**: Game Feel / Controles
* **Coste**: Low
* **Impacto**: Medio
* **Qué es**: Cada disparo del cañón de la nave transfiere una pequeña fuerza vectorial en sentido opuesto al ángulo de la nave (retroceso).
* **Qué problema resuelve**: El disparo se siente estático y aislado de las físicas generales de inercia espacial.
* **Cómo se sentiría**: El jugador experimentará el peso físico de su arma. Disparar repetidamente hacia el frente frenará suavemente su avance, agregando una dimensión táctica de control e inercia espacial.
* **Riesgos o trade-offs**: Un exceso de retroceso puede frustrar al jugador si interfiere constantemente con el pilotaje. Se propone limitar la fuerza de retroceso a un máximo del 5% del impulso del propulsor base.

#### 2. Fragmentación y VFX de Polvo de Asteroides con Estilo Skia
* **Tipo**: Feedback & Juice / Visuals
* **Coste**: Medium
* **Impacto**: Alto
* **Qué es**: Al romper un asteroide, se generan de 8 a 12 micro-partículas que salen despedidas con velocidades aleatorias y se atenúan gradualmente (TTL corto).
* **Qué problema resuelve**: La desaparición abrupta o fragmentación binaria plana de los asteroides se siente artificial y carece del impacto de "destrucción total".
* **Cómo se sentiría**: Las explosiones ganarán tridimensionalidad y espectacularidad visual en el renderizador Skia, haciendo que cada asteroide destruido sea un momento jugoso y gratificante.

---

### 👾 MEJORAS PARA SPACE INVADERS

#### 3. El Efecto "Panic Swarm" (Invasor Furioso)
* **Tipo**: Inteligencia / Ritmo del Juego
* **Coste**: Medium
* **Impacto**: Alto
* **Qué es**: A medida que disminuye el número de invasores activos en pantalla, la velocidad horizontal y la frecuencia de disparo de los invasores restantes escala de forma exponencial no-lineal.
* **Qué problema resuelve**: La monotonía táctica cuando solo quedan 1 o 2 invasores lentos flotando por la pantalla.
* **Cómo se sentiría**: Al final de cada oleada, el juego se transforma en un tenso y dinámico duelo de reflejos rápidos, provocando picos de adrenalina memorables.

#### 4. Barreras Tácticas con Fragmentación Dinámica
* **Tipo**: Game Feel / Visuals
* **Coste**: Medium
* **Impacto**: Alto
* **Qué es**: En lugar de que las barreras se desgasten por bloques rectangulares rígidos pre-renderizados, cada impacto de bala genera partículas de escombros de escudo ("shield debris") que caen flotando por la pantalla.
* **Qué problema resuelve**: El feedback visual de protección se siente estático y anticuado.
* **Cómo se sentiría**: Un tiroteo intenso contra los escudos generará una lluvia de chispas verdes y fragmentos metálicos degradándose con el tiempo, haciendo que el entorno se perciba vivo y destructible.

---

### 🐦 MEJORAS PARA FLAPPY BIRD

#### 5. "Coyote Time" y Zona de Tolerancia de Colisión (Buffer Corner)
* **Tipo**: Controles y Confort del Jugador
* **Coste**: Low
* **Impacto**: Alto
* **Qué es**: Se reduce la caja de colisión (hitbox) del pájaro en un 15% en los extremos de las alas y pico, y se permite un retraso de tolerancia de 50 ms antes de aplicar la derrota definitiva si el jugador presiona aletear justo al rozar la esquina exterior de una tubería.
* **Qué problema resuelve**: Las colisiones injustas por roces de píxeles invisibles, reduciendo la frustración masoquista no placentera.
* **Cómo se sentiría**: El jugador sentirá que realiza "salvadas milagrosas", lo que refuerza la sensación de control, destreza personal y habilidad en lugar de culpar al sistema de detección.

#### 6. Estela de Velocidad y Efecto de Plumas al Aletear
* **Tipo**: Feedback & Juice
* **Coste**: Low
* **Impacto**: Medio
* **Qué es**: Cada pulsación de aleteo genera un pequeño brote radial de 3-4 plumas blancas flotando en sentido opuesto a la gravedad, y una estela difuminada de viento que sigue la trayectoria del pájaro a alta velocidad de caída.
* **Qué problema resuelve**: Falta de dinamismo cinético en el desplazamiento del pájaro.
* **Cómo se sentiría**: El pájaro se percibirá más ágil e interactivo con el entorno aéreo simulado, mejorando la lectura visual del vector de caída.

---

### 🏓 MEJORAS PARA PONG

#### 7. Transferencia Dinámica de Inercia de la Pala (Paddle Smash)
* **Tipo**: Core Gameplay / Mecánica Profunda
* **Coste**: Medium
* **Impacto**: Transformador
* **Qué es**: Si la pala se está moviendo activamente en la dirección vertical en el milisegundo exacto de colisión con la bola, transfiere un porcentaje de su velocidad vertical a la bola, alterando drásticamente su ángulo de rebote e incrementando su velocidad horizontal (efecto de "remate").
* **Qué problema resuelve**: El juego es monótono y predecible, con nulo control creativo del jugador sobre la dirección y efecto de la bola.
* **Cómo se sentiría**: Permite la expresión táctica de "smash" o remates con efecto, elevando significativamente el techo de habilidad ("skill ceiling") y la diversión en duelos competitivos locales o multijugador.

---

## 4. IDEAS TRANSVERSALES DE DISEÑO PARA EL MOTOR

### 1. Marco Común de "Dificultad Dinámica Adaptativa" (Adaptive Pacing)
* Un sistema genérico dentro de `BaseGame` que monitorea las métricas del jugador (proporción de muertes por minuto, precisión de tiro, tiempo de supervivencia) y ajusta los parámetros de los mutadores cargados en el motor en caliente (p. ej. incrementando la velocidad de asteroides o modificando la cadencia de balas enemigas de forma fluida).

### 2. Estructura de Progresión y Logros Arcade Reutilizable
* Un sistema de medallas/logros localizable (I18n) integrado en el Passport que se active mediante eventos comunes lanzados al `EventBus` desde cualquier juego (p. ej., `EVENTS.ON_COMBO_MAX`, `EVENTS.ON_PERFECT_WAVE`). Esto estimula enormemente la retención inter-juegos.

### 3. "Screen Shake & Freeze Frame" como Servicios Unificados
* Centralizar el screenshake físico y congelar brevemente el frame rate (p. ej., 2-3 frames de "hitstop" ante impactos masivos) para que cualquier minijuego nuevo pueda gatillar de forma inmediata retroalimentación táctil y de vibración de alta gama en pantallas móviles.

---

## 5. TOP PRIORIDADES ACCIONABLES (Quick Wins y Alto Impacto)

1. **Paddle Smash en Pong (Inercia de Pala)**: Es una mejora de coste medio pero impacto transformador. Rompe instantáneamente la monotonía de Pong.
2. **"Coyote Time" & Hitbox Reducida en Flappy Bird**: Extremadamente fácil de implementar ajustando solo la caja de colisión geométrica en la definición del componente, pero de impacto masivo en el confort del usuario final.
3. **Inercia de Disparo (Retroceso) en Asteroids**: Proporciona una respuesta física natural excelente a cada cañonazo del jugador local.
4. **Horda Furiosa (Panic Swarm) en Space Invaders**: Eleva la tensión y el dinamismo táctico al final de cada oleada mediante un simple multiplicador exponencial.
5. **VFX de Partículas y Estelas (Juiciness)**: Implementación de estelas y ráfagas de polvo en los motores Skia y Canvas para pulir visualmente los impactos y movimientos.

---

## 6. APUESTAS LOCAS PERO MEMORABLES (Disruptivas)

### 🌌 Asteroids Rogue-Lite Run (Bucle Espacial Infinito)
* Convertir Asteroids en una "run" donde cada oleada superada permite elegir entre 3 mejoras pasivas semi-aleatorias (p. ej., "Disparo Dividido", "Escudo Repulsor al usar propulsores", "Misil de Calor por cada asteroide gigante destruido") y enemigos élites con patrones de tiro orbitales.

### 🤖 Space Invaders: Contraataque Hacker (Absorción de Energía)
* Una nueva habilidad con enfriamiento ("cooldown") que permite desplegar una pequeña burbuja electromagnética temporal que absorbe los proyectiles enemigos y los convierte de forma inmediata en una salva de misiles teledirigidos masivos hacia la flota alienígena.

---
**Documento redactado y auditado por la Dirección Creativa de Diseño.**
*Siempre apuntando a la diversión y el confort del jugador mediante el refinamiento del game feel.*

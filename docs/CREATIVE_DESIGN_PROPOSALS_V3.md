# Propuesta de Diseño Creativo: Arcade Arena V3
**Director de Diseño Creativo:** Jules
**Marco de Trabajo:** *Level Up! The Guide to Great Video Game Design* (Scott Rogers)

---

## 1. Visión General
"Arcade Arena" no es solo una colección de juegos; es un ecosistema de **"Nostalgia Evolucionada"**. Nuestra meta es elevar mecánicas clásicas de los 80 a estándares de pulido y profundidad modernos.

La arquitectura ECS nos permite una **interconectividad sistémica** sin precedentes, mientras que nuestros sistemas de `Juice` y `Particles` garantizan que cada acción del jugador tenga un peso físico y una recompensa visual inmediata. Pasaremos de "clones funcionales" a "experiencias memorables" enfocándonos en las 3Cs: **Character** (fantasía), **Camera** (claridad) y **Controls** (profundidad).

---

## 2. Diagnóstico por Juego

### [Asteroids]
*   **Fantasía:** Piloto experto en zona de desastre cinético.
*   **Loop:** Navegar (Inercia) -> Fragmentar -> Sobrevivir.
*   **Fortalezas:** Control inercial muy sólido y sistema de combos ya presente.
*   **Debilidades:** El espacio se siente vacío y las muertes son a veces anticlimáticas.
*   **Oportunidad:** Añadir "peso" al entorno y micro-objetivos dinámicos.

### [Flappy Bird]
*   **Fantasía:** Supervivencia milimétrica y flujo rítmico.
*   **Loop:** Aletear -> Esquivar -> Umbral.
*   **Fortalezas:** El sistema de "Glide" añade una capa de control moderna muy necesaria.
*   **Debilidades:** Demasiado binario (vivo/muerto); falta de "momentos de gloria".
*   **Oportunidad:** Convertir el riesgo en recompensa mediante el sistema de "Near-Miss".

### [Pong]
*   **Fantasía:** Duelo de reflejos y táctica posicional.
*   **Loop:** Posicionarse -> Impactar -> Engañar.
*   **Fortalezas:** El "Spin" táctico ya permite jugadas avanzadas.
*   **Debilidades:** Intercambios pasivos que pueden volverse monótonos.
*   **Oportunidad:** Introducir "habilidades de pala" y cambios de ritmo (Tempo).

### [Space Invaders]
*   **Fantasía:** Última línea de defensa contra una colmena organizada.
*   **Loop:** Limpiar oleada -> Priorizar amenazas -> Evadir proyectiles.
*   **Fortalezas:** Variedad de tipos de enemigos (Kamikazes, Jefes).
*   **Debilidades:** El ritmo es predecible y el final de fase es lento.
*   **Oportunidad:** Evolucionar hacia un "Bullet Hell" ligero y defensivo.

---

## 3. Propuestas de Mejora por Juego

### [Asteroids]

#### A. Singularidad: Agujero de Gusano (Wormhole)
*   **Tipo:** Sistema / Hazard | **Coste:** Medium | **Impacto:** Alto
*   **Qué es:** Un portal inestable que aparece en el centro. Succiona proyectiles y asteroides cercanos, teletransportándolos al borde opuesto de la pantalla con velocidad aumentada.
*   **Qué problema resuelve:** La falta de peligros ambientales que no sean "chocar contra algo".
*   **Por qué mejora el juego:** Añade una capa de "física de billar" al espacio. El jugador puede usar el portal para disparar a un enemigo que está detrás de él.
*   **Cómo se sentiría:** Tensión espacial. El jugador debe luchar contra la succión mientras calcula trayectorias de asteroides que "vienen del futuro".
*   **Riesgos:** Puede causar caos visual excesivo si no se indica claramente la "salida" del teletransporte.

#### B. Cargo Ship: Suministros Tácticos
*   **Tipo:** Contenido / Sistema | **Coste:** Medium | **Impacto:** Alto
*   **Qué es:** Una nave neutral que cruza la pantalla. Al destruirla, suelta un "Data Core" que otorga un Power-Up temporal: **Railgun** (atraviesa asteroides) o **Point Defense** (destruye balas cercanas).
*   **Qué problema resuelve:** La monotonía del disparo único durante toda la partida.
*   **Por qué mejora el juego:** Introduce decisiones de riesgo/recompensa. ¿Persigo a la nave de carga a través de un cinturón de asteroides?
*   **Cómo se sentiría:** Una oportunidad emocionante. Rompe el ritmo de supervivencia pura para invitar a la agresión táctica.
*   **Riesgos:** Requiere balanceo para que el Railgun no elimine todo el reto de golpe.

#### C. Fragmentos de Cristal (Juice Upgrade)
*   **Tipo:** Feel | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Al destruir un asteroide grande, este no solo se divide, sino que suelta 10-15 partículas brillantes que son atraídas magnéticamente a la nave, otorgando pequeños bonos de puntuación.
*   **Qué problema resuelve:** La destrucción se siente a veces "seca".
*   **Por qué mejora el juego:** Proporciona un feedback visual satisfactorio y una sensación de "cosecha" tras el esfuerzo.
*   **Cómo se sentiría:** "Juicy". Recoger los fragmentos con un sonido de cristal se siente como una recompensa física por la destrucción.
*   **Riesgos:** Ninguno significativo; es puro pulido visual.

---

### [Flappy Bird]

#### A. Sonic Boom: Dash de Precisión
*   **Tipo:** Sistema / Feel | **Coste:** Medium | **Impacto:** Transformador
*   **Qué es:** Si el jugador pasa por el centro exacto de un tubo (Gap) sin usar el Glide, se activa un "Dash" automático que impulsa al pájaro horizontalmente a través del siguiente tubo, destruyéndolo visualmente.
*   **Qué problema resuelve:** La pasividad del loop original donde solo "esperas" a llegar al siguiente tubo.
*   **Por qué mejora el juego:** Premia la maestría extrema. Permite encadenar momentos de alta velocidad, cambiando el género de "paciencia" a "acción rítmica".
*   **Cómo se sentiría:** Adrenalina pura. El efecto visual de romper la barrera del sonido con un pájaro pixelado es hilarante y satisfactorio.
*   **Riesgos:** Puede romper el balance de puntuación; debe ser difícil de ejecutar.

#### B. Near-Miss Style Points
*   **Tipo:** Sistema / UX | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Pasar a menos de 5 píxeles de un tubo activa un efecto de `Juice.pop` en el pájaro y un texto flotante "+10 STYLE". Acumular estilo aumenta el multiplicador de XP.
*   **Qué problema resuelve:** El juego original es "todo o nada". Aquí, el "casi morir" se premia.
*   **Por qué mejora el juego:** Fomenta el juego arriesgado. Los jugadores expertos buscarán rozar los tubos en lugar de pasar por el centro seguro.
*   **Cómo se sentiría:** Validante. El jugador siente que el juego reconoce su habilidad y nervios de acero.
*   **Riesgos:** Debe estar muy bien calibrado para no dar puntos por errores de colisión.

#### C. Ecosistema Evolutivo (Background)
*   **Tipo:** Contenido | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** El fondo cambia cada 10 tubos: Ciudad -> Bosque -> Espacio -> Infierno. Cada bioma tiene su propia paleta de colores vía `PaletteSystem`.
*   **Qué problema resuelve:** Fatiga visual y falta de sensación de progreso en la "run".
*   **Por qué mejora el juego:** Da hitos visuales claros. "Llegué al espacio" es un objetivo más tangible que "Tengo 30 puntos".
*   **Cómo se sentiría:** Sensación de viaje. El jugador siente que está recorriendo una gran distancia épica.
*   **Riesgos:** Evitar que el cambio de fondo distraiga del gameplay.

---

### [Pong]

#### A. Overdrive: Charged Smash
*   **Tipo:** Sistema | **Coste:** Medium | **Impacto:** Alto
*   **Qué es:** Mantener el botón de movimiento opuesto a la dirección de la bola carga la pala. El siguiente impacto será un "Smash" que viaja a 2x de velocidad con una estela de fuego.
*   **Qué problema resuelve:** Rallies eternos y aburridos.
*   **Por qué mejora el juego:** Introduce una mecánica de "ataque cargado". El jugador sacrifica posicionamiento por potencia de fuego.
*   **Cómo se sentiría:** Poderoso. Lanzar un golpe imparable tras un intercambio largo se siente como un "Home Run".
*   **Riesgos:** Puede ser frustrante para el receptor si no hay un telegrafiado visual claro.

#### B. Gravity Well (Anomalía Central)
*   **Tipo:** Sistema / Feel | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Un punto de gravedad en el centro exacto que curva ligeramente la trayectoria de la bola hacia el centro del campo.
*   **Qué problema resuelve:** La trayectoria rectilínea predecible de 1972.
*   **Por qué mejora el juego:** Obliga a corregir constantemente el ángulo. Permite "tiros con parábola" imposibles en el Pong clásico.
*   **Cómo se sentiría:** Orgánico. La bola se siente más "viva" y menos como un objeto matemático rígido.
*   **Riesgos:** Puede hacer que la bola nunca llegue a los bordes si la gravedad es muy fuerte.

#### C. Feedback de Impacto Unificado
*   **Tipo:** Feel | **Coste:** Low | **Impacto:** Alto
*   **Qué es:** Cada golpe de pala genera un `ScreenShake` de 50ms, un `Juice.pop` en la pala y una ráfaga de chispas en el punto de contacto.
*   **Qué problema resuelve:** La sensación de "golpear aire" que tienen muchos clones de Pong.
*   **Por qué mejora el juego:** Aplica el principio de Rogers: "Si el jugador hace algo, el juego debe gritarlo".
*   **Cómo se sentiría:** Contundente. Cada intercambio se siente como un choque de fuerzas físicas reales.
*   **Riesgos:** Ninguno; es pura mejora de Game Feel.

---

### [Space Invaders]

#### A. El Enjambre: Formación Dinámica
*   **Tipo:** Sistema / IA | **Coste:** High | **Impacto:** Transformador
*   **Qué es:** Los enemigos ya no solo se mueven en bloque. Al quedar pocos (ej. menos de 10), se reorganizan en una formación circular que rodea al jugador o en una columna de "bombardeo" rápido.
*   **Qué problema resuelve:** El tedio de perseguir a los últimos 3 aliens que se mueven de lado a lado.
*   **Por qué mejora el juego:** Crea un "clímax" en cada nivel. La dificultad escala de forma inteligente en lugar de solo por velocidad.
*   **Cómo se sentiría:** Amenazante. Los enemigos dejan de ser "blancos estáticos" para comportarse como una unidad táctica.
*   **Riesgos:** Requiere una lógica de formación robusta para no causar errores de posición.

#### B. Escudo Ablativo (Repair System)
*   **Tipo:** Sistema | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Los búnkeres se pueden reparar si el jugador recoge los "Nano-Bots" que caen raramente de los enemigos destruidos.
*   **Qué problema resuelve:** La pérdida total de protección en niveles avanzados que hace el juego imposible.
*   **Por qué mejora el juego:** Añade una micro-gestión de recursos. El jugador debe decidir si arriesgarse a salir de la cobertura para recoger piezas de reparación.
*   **Cómo se sentiría:** Estratégico. Da al jugador una herramienta defensiva proactiva en lugar de solo reactiva.
*   **Riesgos:** Puede fomentar el "campeo" si la reparación es demasiado fácil.

#### C. Kill-Chain Visualizer
*   **Tipo:** Feel / UX | **Coste:** Low | **Impacto:** Medio
*   **Qué es:** Un HUD que muestra una barra de "Invasión" que se llena con cada baja rápida. Al llenarse, el siguiente disparo es un misil de área.
*   **Qué problema resuelve:** Falta de incentivo para disparar rápido y con precisión.
*   **Por qué mejora el juego:** Proporciona un mini-bucle de recompensa dentro de la oleada.
*   **Cómo se sentiría:** Empoderador. El HUD reaccionando a tu destreza motiva a mantener el ritmo de combate.
*   **Riesgos:** Demasiada UI puede tapar a los enemigos superiores.

---

## 4. Ideas Transversales (The Arcade Ecosystem)

### A. The Mastery Layer (XPSystem Connection)
Conectar las acciones de todos los juegos con el `XPSystem`.
*   **Logro:** "Piloto de Cristal" (Asteroids) desbloquea la **Paleta Neon** para Space Invaders.
*   **Logro:** "Mantenlo Vivo" (Flappy) desbloquea **Estelas de Estrellas** para la nave de Asteroids.
*   **Efecto:** Crea un meta-juego que incentiva a probar todo el catálogo.

### B. Impact Freeze Universal
Implementar una pausa de 33ms (2 frames) en la simulación cada vez que una entidad "Jefe" o el "Jugador" es destruido.
*   **Efecto:** Aumenta exponencialmente la percepción de peso e impacto sin cambiar el código de los juegos. Es el truco de "Game Feel" más barato y efectivo.

### C. Ghost Player (Asynchronous Competition)
Grabar la última partida exitosa del jugador y mostrarla como una silueta semitransparente (`opacity: 0.3` vía `JuiceSystem`).
*   **Efecto:** El jugador compite contra su propia maestría previa. Es la forma más pura de fomentar la superación personal.

---

## 5. Top Prioridades (Producción Inmediata)
1.  **Sonic Boom Dash (Flappy):** Mayor retorno de inversión en "diversión" y factor sorpresa.
2.  **Impact Freeze Universal:** Mejora instantánea de calidad percibida en todo el proyecto.
3.  **Gravity Well (Pong):** Cambio de mecánica simple que moderniza el juego radicalmente.
4.  **Cargo Ships (Asteroids):** Rompe la monotonía y añade objetivos tácticos.
5.  **Near-Miss System (Universal):** Valida la habilidad del jugador en todos los contextos de esquiva.

---

## 6. Apuestas Locas (Moonshots)

### "Rogue-Invaders"
Space Invaders donde cada nivel te permite elegir un "Mod" (ej: "Balas que rebotan", "Doble Cañón", "Drones de Defensa"). Convierte el arcade estático en un mini-Roguelite de 10 minutos.

### "Pong: Bullet Hell"
Un modo donde la bola no es lo único peligroso; la pala dispara proyectiles al oponente para forzar su movimiento, mientras intentas meter gol.

---
*Este documento es una hoja de ruta para transformar el código en cultura de juego.*

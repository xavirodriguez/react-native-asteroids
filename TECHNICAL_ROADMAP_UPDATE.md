## 🔍 Cuello de botella actual

La evolución del juego se ve limitada por la **falta de un sistema de efectos de estado (Status Effects)** y la **rigidez en la gestión de feedback visual (Screen Shake)**. Aunque el motor es funcional, carece de la infraestructura para implementar power-ups o penalizaciones temporales de forma escalable (SES). Además, el feedback visual actual es "mutuamente excluyente" (un golpe nuevo cancela la sacudida de uno anterior), lo que empobrece el "game feel" en situaciones de combate intenso.

## 🛠️ Solución propuesta

1.  **Implementación de Status Effect System (SES)**: Un sistema basado en componentes (`ModifierStack`) que permite apilar efectos temporales (velocidad, cadencia, invulnerabilidad) de forma desacoplada.
2.  **Feedback Visual Aditivo**: Migración del Screen Shake de un modelo Singleton a uno basado en entidades efímeras, permitiendo que múltiples fuentes de impacto sumen su intensidad.
3.  **Optimización del ReplayRecorder**: Transición a un buffer circular O(1) para garantizar estabilidad en sesiones largas sin degradación de rendimiento.
4.  **Integración de Audio Latency-Free**: Conexión del `AudioSystem` con precarga de assets obligatoria durante la inicialización del juego.

## ⚙️ Diseño técnico

-   **Componentes**:
    -   `ModifierStack`: Almacena un array de `Modifier` (id, tipo, valor, duración).
    -   `ScreenShake`: Ahora es un componente regular, no singleton.
-   **Sistemas**:
    -   `StatusEffectSystem`: Procesa el `ModifierStack`, decrementando `remaining` y eliminando expirados. Se registra en la fase de `Simulation`.
    -   `ScreenShakeSystem`: Gestiona el TTL de las entidades de impacto.
-   **Flujo de Datos**:
    -   Colisión → Crea Entidad con `ScreenShakeComponent`.
    -   Renderer → Consulta todas las entidades con `ScreenShake` y suma sus vectores de desplazamiento usando el `RandomService` de renderizado.
    -   Power-up (Futuro) → Añade `Modifier` al `ModifierStack` del jugador.

## 🎮 Impacto en el juego

-   **Rendimiento**: La optimización de `ReplayRecorder` elimina los micro-stutters tras 5+ minutos de juego.
-   **Mantenibilidad**: El SES permite añadir nuevos power-ups simplemente definiendo un nuevo tipo de modificador, sin tocar la lógica de movimiento o disparo.
-   **Experiencia del Jugador**: Feedback de impactos mucho más visceral y robusto. Audio instantáneo desde el primer frame de juego.

## 🚀 Qué desbloquea después

Este avance habilita inmediatamente:
1.  **Sistema de Power-ups**: Escudos temporales, disparo triple, o turbo.
2.  **Dificultad Dinámica**: Debuffs al jugador o buffs a enemigos basados en el tiempo de vida.
3.  **Culling Espacial**: El siguiente paso lógico para manejar cientos de entidades de partículas y fragmentos de asteroides sin saturar el bus de datos.

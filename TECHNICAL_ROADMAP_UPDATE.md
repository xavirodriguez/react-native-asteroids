## 🔍 Cuello de botella actual

**Inercia Funcional y Falta de Profundidad Sistémica (Engagement Depth).**

Tras la implementación del Status Effect System (SES) y las mejoras en estabilidad, el motor ha superado sus bloqueos estructurales inmediatos. Sin embargo, se ha detectado que la "profundidad de juego" es limitada debido a la falta de interacción dinámica del jugador con el mundo y un feedback sensorial incompleto.

## 🛠️ Solución propuesta (FASE: REFORZAMIENTO Y ECONOMÍA)

1.  **Framework de Power-ups "Loot-Driven"**: Implementación de `LootSystem` y `PowerUpSystem`. Aprovecha el `ModifierStack` existente para permitir que la destrucción de asteroides genere recompensas tácticas (disparo triple, escudos, velocidad).
2.  **Middleware de Audio Semántico**: Centralización del feedback auditivo en `BaseGame`. Se mapean eventos abstractos (`asteroid:destroyed`, `ship:shoot`) a efectos sonoros concretos, desacoplando la lógica de juego del motor de audio.
3.  **Disciplina ECS (Seguimiento de Estado)**: Migración masiva hacia `mutateComponent`. Se garantiza que cualquier cambio en los datos de un componente incremente el `_stateVersion` del `World`, habilitando optimizaciones en el Renderer y trazabilidad total en herramientas de depuración.

## ⚙️ Diseño técnico

-   **Componentes**:
    -   `LootTableComponent`: Define probabilidades de drop.
    -   `PowerUpComponent`: Metadatos del ítem recolectable.
-   **Sistemas**:
    -   `LootSystem`: Escucha eventos de destrucción y spawnea entidades con `TTLComponent`.
    -   `PowerUpSystem`: Detecta colisiones jugador-ítem e inyecta modificadores en el `ModifierStack`.
-   **Integración de Audio**: El `BaseGame` actúa como puente semántico, escuchando el `EventBus` global y despachando comandos al `AudioSystem`.

## 🎮 Impacto en el juego

-   **Game Feel**: El audio síncrono y la variabilidad de mecánicas mediante power-ups transforman la experiencia de "demo técnica" a "juego sólido".
-   **Trazabilidad**: La disciplina de mutación permite que el `StateHasher` y el `DebugOverlay` detecten cambios de forma reactiva y determinista.
-   **Mantenibilidad**: Los nuevos efectos se definen como datos (`Modifiers`), no como código nuevo en sistemas de física.

## 🚀 Qué desbloquea después

**Simulación de Alta Densidad (Spatial Culling para Simulación).**

Con un bucle de juego divertido y mecánicamente completo, el siguiente límite es el volumen de entidades. El avance hacia el **Culling Espacial Global** es el próximo hito: optimizar no solo las colisiones, sino la simulación misma (`MovementSystem`, `ParticleSystem`) para que solo procese entidades en celdas activas, permitiendo miles de fragmentos de asteroides simultáneos a 60 FPS.

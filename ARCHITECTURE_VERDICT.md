# Dictamen Técnico: Arquitectura y Estado de TinyAsterEngine

**Emisor:** Arquitecto Principal
**Prioridad:** Unificación, Determinismo y Disciplina CNG.

---

## 1. Diagnóstico Técnico

Tras la auditoría del codebase, se identifican las siguientes patologías críticas que comprometen la escalabilidad y el determinismo del motor:

1.  **Fragmentación del Bucle de Renderizado:** Coexisten múltiples orquestadores de `requestAnimationFrame` (en `GameLoop.ts` y `CanvasRenderer.tsx`), lo que produce desincronización entre la simulación lógica (ticks fijos) y la representación visual.
2.  **Fugas de No-Determinismo:** Uso de `Math.random()` en componentes de cámara, renderizado y UI. Esto invalida cualquier capacidad de replay o netcode basado en lockstep.
3.  **Duplicidad de Integración Física:** La lógica de movimiento y fricción está duplicada entre los sistemas del motor (`MovementSystem.ts`, `FrictionSystem.ts`) y la lógica de predicción de los juegos (`AsteroidsGame.ts`).
4.  **Hibridación Incompleta de Física:** Existe un adaptador de Matter.js infrautilizado que compite conceptualmente con el motor built-in determinista.

---

## 2. Tabla de Decisiones

| Recomendación | Clasificación | Acción Ejecutable |
| :--- | :--- | :--- |
| **Erradicación de `Math.random()`** | **CRÍTICA AHORA** | Reemplazo total por `RandomService` con semillas segregadas (render vs gameplay). |
| **Unificación de Loop** | **CRÍTICA AHORA** | `GameLoop.ts` es el único emisor de pulsos. `CanvasRenderer.tsx` se reduce a un componente puramente reactivo. |
| **Abstracción de Integración Física** | **CRÍTICA AHORA** | Centralizar fórmulas de integración (Euler/Fricción) para asegurar paridad simulación/predicción. |
| **Blindaje de CNG** | **IMPORTANTE DESPUÉS** | Implementar Expo Config Plugins para cualquier dependencia nativa futura (Skia/Haptics). |
| **Descarte de Matter.js en Gameplay** | **POSPONER** | Mantener como sandbox, pero prohibir su uso en el loop principal determinista. |
| **OTA Automation** | **IMPORTANTE DESPUÉS** | Configurar GitHub Actions para `eas update`. |
| **RSC / API / Server-side** | **NO HACER** | Prohibido hasta que se justifique autoridad centralizada de secretos. |

---

## 3. Reglas No Negociables (The 0-Ambiguity Policy)

1.  **Single Source of Tick:** Ningún componente React puede invocar `requestAnimationFrame`. Solo el `GameLoop` tiene autoridad para marcar el tiempo.
2.  **No Direct Transform Manipulation:** Toda manipulación de posición/rotación fuera de la creación de entidades debe pasar por un `System`.
3.  **Deterministic Randomness:** El uso de `Math.random()` en cualquier archivo bajo `src/` será motivo de rechazo inmediato de PR.
4.  **ECS Orthogonality:** Prohibido crear "caminos paralelos" al ECS para lógica de juego. Si algo se mueve, es una entidad con componentes procesada por sistemas.

---

## 4. Plan de Ejecución por Fases

### Fase 1: Blindaje (Finalizado)
- Sustitución de `Math.random()` en todos los sistemas core y renderers.
- Segregación de instancias de `RandomService` para evitar deriva de semillas por efectos visuales.

### Fase 2: Unificación (En curso)
- Refactor de `CanvasRenderer.tsx` para eliminar loops redundantes.
- Vinculación de la reactividad de `GameEngine.tsx` con el estado interno de los renderers.

### Fase 3: Abstracción (Próximo)
- Creación de `PhysicsUtils.ts` para unificar fórmulas de movimiento y fricción.
- Eliminación de fórmulas "magic-number" en `AsteroidsGame.ts`.

---

## 5. Veredicto Final

El proyecto debe evolucionar hacia una **arquitectura de simulación pura** donde React sea únicamente una capa de presentación descartable. La paridad bit-a-bit entre clientes es la métrica de éxito. Se aprueba la continuación del desarrollo bajo la estricta observancia de las Reglas No Negociables.

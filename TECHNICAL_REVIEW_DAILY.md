# Daily Technical Review Report: TinyAsteroids Engine & Retro Arcade
**Fecha:** 2025-05-20
**Estado Global:** Saludable con consolidación en curso.

---

### 1. Resumen ejecutivo

El proyecto mantiene una arquitectura de motor ECS (`TinyAsterEngine`) robusta y bien diseñada. La unificación de tipos en `EngineTypes.ts` se ha completado con éxito, eliminando la deuda técnica de `CoreTypes.ts`. Sin embargo, persiste una **divergencia arquitectónica de alta prioridad**: el componente experimental `src/game/GameEngine.tsx` utiliza un ciclo de vida basado en Reanimated y Matter.js directo que ignora el estándar del motor. Además, se han detectado múltiples usos de `Math.random()` en módulos de renderizado, lo que degrada el determinismo visual esperado en una arquitectura de este tipo.

---

### 2. Puntuación por principio

| Principio | Estado | Puntos (0-5) | Justificación |
|---|---|---|---|
| 1. Separar gameplay, render y UI | **OK** | 5 | Separación lograda en juegos principales (Asteroids, Space Invaders). |
| 2. Game loop explícito | **OK** | 5 | `GameLoop.ts` con fixed timestep de 60 FPS es la autoridad. |
| 3. Lógica determinista | **PARCIAL** | 4 | Lógica core usa `RandomService`, pero el renderizado usa `Math.random()`. |
| 4. Data-oriented para entidades | **OK** | 5 | ECS puro con IDs y componentes planos. |
| 5. Composición sobre herencia | **OK** | 5 | Las entidades se definen dinámicamente por sus componentes. |
| 6. Física tras capa de dominio | **CRÍTICO** | 2 | Divergencia entre `CollisionSystem` y Matter.js experimental. |
| 7. Máquina de estados explícita | **OK** | 4 | Gestión centralizada en `BaseGameStateSystem`. |
| 8. Estado efímero vs persistente | **OK** | 5 | Separación clara entre World y AsyncStorage/Zod. |
| 9. Desacoplo de input | **OK** | 5 | `InputManager` traduce hardware a comandos de dominio. |
| 10. Delta time estable | **OK** | 5 | Loop con acumulador de paso fijo garantizado. |
| 11. UI como proyección | **OK** | 5 | React consume proyecciones con throttling de 15 FPS. |
| 12. Configuración en constantes | **OK** | 5 | `GAME_CONFIG` centralizado y tipado. |
| 13. Tipos explícitos y unions | **OK** | 5 | **CONSOLIDADO:** Tipos unificados en `EngineTypes.ts`. |
| 14. Validación de datos | **OK** | 5 | Uso de Zod para persistencia de HighScores. |
| 15. Aislamiento de efectos | **OK** | 5 | Servicios aislados para haptics y assets. |
| 16. Optimización de frecuencia | **OK** | 5 | Priorización del loop lógico (60fps) sobre el renderizado React (15fps). |
| 17. Responsabilidad única | **OK** | 5 | Sistemas modulares (Boundary, Friction, TTL). |
| 18. Testeable sin UI | **OK** | 5 | 50 tests confirman la estabilidad de las reglas de juego. |
| 19. Extensibilidad controlada | **OK** | 5 | Patrón `Scene` y `BaseGame` facilita la iteración rápida. |
| 20. Claridad temporal/espacial | **OK** | 5 | World versioning y caché de queries aseguran coherencia. |

---

### 3. Hallazgos prioritarios

#### A. Divergencia de Motor: Matter.js vs ECS Estable
*   **Severidad**: Alta
*   **Evidencia**: `src/game/GameEngine.tsx` usa `useFrameCallback` y Matter.js directamente, operando como un "segundo motor" fuera de `BaseGame`.
*   **Por qué importa**: Fragmenta la arquitectura, duplica el mantenimiento y crea inconsistencias en el comportamiento de las entidades físicas.
*   **Recomendación**: Migrar la lógica de `GameEngine.tsx` a un `PhysicsSystem` oficial que utilice el `MatterPhysicsAdapter` ya existente.

#### B. Uso de Math.random() en Renderizado
*   **Severidad**: Media
*   **Evidencia**: Detectado en `AsteroidsSkiaVisuals.ts`, `AsteroidsCanvasVisuals.ts` y `StarField.ts`.
*   **Por qué importa**: Rompe el determinismo visual. Dos ejecuciones con la misma semilla de `RandomService` se verán diferentes (ej. el parpadeo de las estrellas o el humo de la nave).
*   **Recomendación**: Pasar una referencia al `RandomService` (o una semilla derivada) a las funciones de renderizado para efectos aleatorios visuales.

#### C. Lógica de UI mezclada con el Loop
*   **Severidad**: Baja
*   **Evidencia**: `src/components/GameEngine.tsx` (el wrapper de React) utiliza `setVersion` en cada frame del render loop.
*   **Por qué importa**: Aunque es necesario para disparar el re-render de React, debe asegurarse que el componente que recibe el world sea lo más ligero posible.
*   **Recomendación**: Asegurar que los Renderers (Canvas/Skia) sean los únicos que respondan a este cambio de versión para minimizar el trabajo del reconciliador de React.

---

### 4. Deriva hacia pensamiento web/app

*   **Señal detectada**: El uso de `useFrameCallback` de Reanimated para controlar el flujo principal de juego en la rama experimental.
*   **Corrección**: Reanimated es excelente para animaciones de UI, pero para un motor de juego con lógica de colisiones y física determinista, se debe usar un loop de paso fijo independiente del framerate de la pantalla, como el implementado en `GameLoop.ts`.

---

### 5. Calidad del núcleo del juego

*   **Loop**: Excelente, el patrón acumulador es el estándar de oro.
*   **Estado**: Robusto, el caché de queries en el `World` es una optimización de alto nivel.
*   **Input**: Muy bien diseñado, soporta múltiples controladores de forma transparente.
*   **Física**: La dualidad entre `CollisionSystem` y Matter.js es el único punto débil; requiere unificación.

---

### 6. Calidad de la capa de UI y app shell

*   **HUD**: Desacoplado y reactivo a las proyecciones de estado.
*   **Navegación**: Correcta, `Expo Router` se encarga del ciclo de vida de las escenas de alto nivel.
*   **Overlays**: Los menús de pausa y Game Over no interfieren con la precisión del loop.

---

### 7. Testabilidad y cobertura útil

*   **Estado**: 50 tests PASS.
*   **Calidad**: Los tests en `Integration.test.ts` son ejemplares, validando ciclos de vida completos (spawn -> collision -> split -> score).
*   **Mejora**: Añadir tests para el `PhysicsSystem` (Matter.js) una vez integrado en el flujo ECS principal.

---

### 8. Riesgos de rendimiento

*   **GC Pressure**: El `boundsCache` en `CollisionSystem` está ahora controlado.
*   **Bridge RN**: El throttling a 15 FPS en `useGame` es una salvaguarda vital para el rendimiento en dispositivos Android de gama media.

---

### 9. Acciones recomendadas

*   **Hacer hoy**: (COMPLETADO) Unificar tipos y documentar la divergencia de Matter.js.
*   **Hacer esta semana**: Migrar un juego existente (o crear una escena nueva) que utilice el `PhysicsSystem` con Matter.js para demostrar la integración oficial.
*   **Hacer más adelante**: Implementar `Skia Atlas` para el renderizado masivo de partículas y estrellas, eliminando los bucles de dibujo individuales en el Canvas.

---

### 10. Prompt de seguimiento para el próximo día

```markdown
"Finalizar la integración de Matter.js como un sistema ECS estándar. Migrar la lógica de bodies de 'src/game/GameEngine.tsx' a un nuevo nivel en Asteroids que use el PhysicsSystem y el MatterPhysicsAdapter. Asegurar que todos los efectos aleatorios en el renderizado utilicen una semilla controlada en lugar de Math.random()."
```

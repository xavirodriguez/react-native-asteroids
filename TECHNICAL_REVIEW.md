# Daily Technical Review Report: TinyAsteroids Engine & Retro Arcade

### 1. Resumen ejecutivo

El proyecto se encuentra en una fase de consolidación arquitectónica tras una serie de refactorizaciones clave que han elevado el motor ECS (`TinyAsterEngine`) a un nivel de madurez alto. La implementación de un loop de paso fijo (fixed timestep), el determinismo mediante `RandomService` y el sistema de consultas con caché en el `World` son aciertos técnicos sobresalientes. Sin embargo, existe una **divergencia arquitectónica crítica**: coexisten dos motores (un ECS estable y una rama experimental con Matter.js en `src/app/GameEngine.tsx`) que duplican responsabilidades y tipos (`CoreTypes.ts` vs `EngineTypes.ts`). La calidad del gameplay es excelente, con una separación clara de la UI, pero el riesgo de deriva técnica por esta duplicidad debe ser atajado para evitar confusión en el desarrollo de futuras mecánicas.

---

### 2. Puntuación por principio

| Principio | Estado | Puntos (0-5) | Justificación |
|---|---|---|---|
| 1. Separar gameplay, render y UI | **OK** | 5 | Los juegos (Asteroids, Space Invaders) están totalmente desacoplados de React. |
| 2. Game loop explícito | **OK** | 5 | `GameLoop.ts` implementa un patrón acumulador de paso fijo de 60 FPS. |
| 3. Lógica determinista | **OK** | 5 | Uso consistente de `RandomService` (Mulberry32) en todos los sistemas de juego. |
| 4. Enfoque data-oriented | **OK** | 5 | El ECS es puro, con entidades como IDs y componentes como objetos de datos. |
| 5. Composición sobre herencia | **OK** | 5 | Las entidades se construyen mediante la adición dinámica de componentes. |
| 6. Motor físico tras capa de dominio | **PARCIAL** | 3 | `CollisionSystem` es interno; la integración con Matter.js es experimental y externa al ECS principal. |
| 7. Máquina de estados explícita | **OK** | 4 | `BaseGame` y los sistemas de estado gestionan Pausa/GameOver de forma centralizada. |
| 8. Estado efímero vs persistente | **OK** | 5 | Clara distinción entre el `World` (efímero) y `useHighScore` (persistente). |
| 9. Desacoplo de Input | **OK** | 5 | `InputManager` traduce eventos físicos a acciones de dominio (thrust, shoot). |
| 10. Delta time estable | **OK** | 5 | El loop garantiza actualizaciones lógicas a 16.66ms constantes. |
| 11. UI como proyección | **OK** | 5 | `useGame` proyecta el estado del motor a React con throttling de 15 FPS. |
| 12. Configuración en constantes | **OK** | 5 | `GAME_CONFIG` centraliza el balanceo de cada juego. |
| 13. Tipos explícitos y Unions | **PARCIAL** | 3 | Duplicidad de tipos entre `EngineTypes.ts` y `CoreTypes.ts`. |
| 14. Validación de datos | **OK** | 5 | `useHighScore` utiliza Zod para validar el almacenamiento persistente. |
| 15. Aislamiento de efectos | **OK** | 5 | Haptics y Assets se gestionan mediante servicios y utilidades aisladas. |
| 16. Optimización de frecuencia | **OK** | 5 | Throttling inteligente del bridge React-Native para priorizar el loop. |
| 17. Responsabilidad única | **OK** | 5 | Sistemas como `BoundarySystem` y `TTLSystem` tienen un propósito único y claro. |
| 18. Testeable sin UI | **OK** | 5 | La lógica crítica se valida con Jest operando directamente sobre el `World`. |
| 19. Extensibilidad controlada | **OK** | 5 | La arquitectura de `BaseGame` y `Scene` facilita añadir nuevos juegos. |
| 20. Claridad temporal/espacial | **OK** | 5 | El uso de `World.version` y caché de queries asegura coherencia por frame. |

---

### 3. Hallazgos prioritarios

#### A. Divergencia Arquitectónica y Duplicidad de Motor
*   **Severidad**: Crítica
*   **Evidencia**: Existe el motor ECS estable en `src/engine/` y una implementación experimental en `src/app/GameEngine.tsx` que utiliza `useFrameCallback` de Reanimated y Matter.js directamente.
*   **Por qué importa**: Crea confusión sobre cuál es el estándar del proyecto, fragmenta la base de código y duplica el mantenimiento de sistemas básicos (movimiento, render).
*   **Recomendación**: Integrar la lógica de Matter.js como un `System` dentro del ECS estable (`PhysicsSystem.ts` ya existe pero está infrautilizado en los juegos principales). Eliminar el componente experimental una vez migrado.

#### B. Colisión de Tipos de Datos (EngineTypes vs CoreTypes)
*   **Severidad**: Alta
*   **Evidencia**: `src/engine/types/EngineTypes.ts` define `PositionComponent` mientras `src/engine/core/types/CoreTypes.ts` define `TransformComponent` para el mismo propósito.
*   **Por qué importa**: Rompe el principio de "Single Source of Truth" y provoca errores de tipado al intentar reutilizar sistemas entre ramas del motor.
*   **Recomendación**: Unificar ambos archivos en un único namespace de componentes core en el motor, priorizando la nomenclatura de `TransformComponent` si se busca compatibilidad con motores de física.

#### C. Gestión de Memoria en CollisionSystem (boundsCache)
*   **Severidad**: Media
*   **Evidencia**: `CollisionSystem.ts` mantiene un `boundsCache` que se expande pero no limpia las referencias a entidades destruidas al final del frame.
*   **Por qué importa**: Riesgo latente de fugas de memoria (memory leaks) si las entidades se crean y destruyen masivamente durante sesiones largas.
*   **Recomendación**: Implementar una limpieza de referencias en el caché al final de la ejecución de `update()` o usar un pool de objetos `BoundData`.

---

### 4. Deriva hacia pensamiento web/app

*   **Señal detectada**: Uso inicial de `setState` para cada frame del juego.
*   **Estado**: **CORREGIDO**. La implementación de `useGame` con throttling de 15 FPS y bypass para estados críticos es una excelente práctica de ingeniería de videojuegos para evitar saturar el bridge de React Native.
*   **Observación**: El componente `GameEngine.tsx` experimental aún presenta trazas de lógica de "App React" mezclada con el loop (snapshotting manual en el callback). Debe moverse a sistemas ECS.

---

### 5. Calidad del núcleo del juego

*   **Loop**: Excelente (Fixed Timestep 60 FPS).
*   **Estado**: Muy bueno (ECS con caché de queries).
*   **Input**: Robusto (InputManager desacoplado).
*   **Física**: Simple y efectiva en el ECS principal; la integración con Matter.js requiere estandarización.
*   **Timing**: Correcto (Uso de Delta Time en milisegundos).

---

### 6. Calidad de la capa de UI y app shell

*   **HUD/Menús**: Bien aislados en componentes React.
*   **Navegación**: Correcta vía `Expo Router`.
*   **Integración**: La capa React no controla el dominio; solo se suscribe a proyecciones del estado mediante `useGame`.

---

### 7. Testabilidad y cobertura útil

*   **Estado**: 50 tests PASS.
*   **Cobertura**: Excelente en lógica de colisiones, sistemas de estado y servicios de utilidad (`RandomService`).
*   **Áreas desprotegidas**: Falta de tests de integración para el sistema de escenas (`SceneManager`) y validación de la estabilidad del bridge bajo carga.

---

### 8. Riesgos de rendimiento

*   **GC Pressure**: El `World` minimiza asignaciones, pero el `boundsCache` del `CollisionSystem` debe ser vigilado.
*   **Bridge Saturation**: Mitigado por el throttling de 15 FPS en `useGame`.
*   **Skia/Web Performance**: El uso de `require` dinámico para Skia evita errores en web, pero el rendimiento de Skia en web puede ser inferior al Canvas nativo si no se usa `Atlas` para partículas.

---

### 9. Acciones recomendadas

*   **Hacer hoy**: Unificar `EngineTypes.ts` y `CoreTypes.ts`. Mover `TransformComponent` al core y eliminar duplicados.
*   **Hacer esta semana**: Integrar formalmente `MatterPhysicsAdapter` en un juego real (ej. un nuevo nivel de Asteroids con física de cuerpos rígidos) para validar el `PhysicsSystem`.
*   **Hacer más adelante**: Implementar un sistema de `Atlas` en el renderer para optimizar el dibujo masivo de partículas y meteoritos.

---

### 10. Prompt de seguimiento para el próximo día

```markdown
"Refactorizar EngineTypes.ts y CoreTypes.ts para eliminar la duplicidad de componentes (Position vs Transform). Asegurar que todos los sistemas utilicen la nueva definición unificada y verificar que la suite de tests (50 tests) siga pasando tras la migración."
```

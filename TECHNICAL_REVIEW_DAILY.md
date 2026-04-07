# Informe de Revisión Técnica Diaria - Lead Technical Reviewer
**Fecha:** 2024-05-24
**Proyecto:** Indie Game Engine (React Native + Skia + ECS)

---

### 1. Resumen ejecutivo
El proyecto presenta una base sólida orientada a ECS (Entity Component System) y una clara intención de separar el núcleo del juego de la capa de React. Se observa una implementación robusta de juegos clásicos (Asteroids, Pong, Space Invaders) con un motor propio. Sin embargo, existen inconsistencias en la integración de la física (mezcla de manual vs Matter.js), una duplicidad de sistemas de renderizado (Canvas tradicional vs Skia) y una dependencia incipiente de Reanimated para el loop principal en algunos componentes que podría comprometer el determinismo si no se maneja con cuidado a través del `GameLoop` centralizado. La arquitectura es mayoritariamente "Game-First", pero hay zonas donde los patrones de React/Web están empezando a filtrarse, especialmente en la gestión de snapshots para el renderizado.

---

### 2. Puntuación por principio

| Principio | Estado | Puntuación | Justificación |
| :--- | :--- | :---: | :--- |
| 1. Separar gameplay, render y UI | OK | 4/5 | Muy bien separado en la mayoría de los juegos; `GameEngine.tsx` mezcla algo de escena demo. |
| 2. Game loop explícito | OK | 4/5 | Existe `GameLoop.ts` con fixed timestep, fundamental para la estabilidad. |
| 3. Lógica determinista | PARCIAL | 3/5 | Uso de `Math.random()` detectado en visuales y reset de bola en Pong; requiere `RandomService`. |
| 4. Data-oriented para entidades | OK | 4/5 | ECS bien implementado con componentes como interfaces de datos puras. |
| 5. Priorizar composición | OK | 5/5 | Uso extensivo de ECS y sistemas modulares. |
| 6. Aislar motor físico | PARCIAL | 3/5 | Existe `IPhysicsAdapter`, pero Asteroids usa integración manual. Falta uniformidad. |
| 7. Máquina de estados explícita | OK | 4/5 | Implementado correctamente en `AsteroidGameStateSystem` y similares. |
| 8. Estado efímero vs persistente | OK | 4/5 | `SaveSystem` maneja la persistencia de forma aislada y tipada. |
| 9. Desacoplar input físico | OK | 5/5 | `UnifiedInputSystem` desacopla perfectamente el hardware de las acciones. |
| 10. Delta time estable | OK | 4/5 | `GameLoop` usa acumulador para asegurar actualizaciones lógicas a 60Hz. |
| 11. UI como proyección | OK | 4/5 | HUDs leen de singletons en el World; no tienen autoridad sobre el gameplay. |
| 12. Configuración encapsulada | OK | 5/5 | Uso de `GAME_CONFIG` centralizados y constantes tipadas. |
| 13. Modelar con tipos/unions | OK | 5/5 | Excelente uso de TypeScript para definir el dominio. |
| 14. Validar datos externos | OK | 4/5 | Uso de Zod en persistencia asegura integridad de datos. |
| 15. Aislar efectos secundarios | OK | 4/5 | Servicios dedicados para Audio, Haptics y Assets. |
| 16. Optimizar frecuencia | OK | 4/5 | El loop de 60Hz (lógica) prima sobre el framerate de renderizado. |
| 17. Responsabilidad única | OK | 4/5 | Sistemas ECS bien definidos y desacoplados. |
| 18. Testeable sin UI | OK | 5/5 | Cobertura de tests unitarios en sistemas críticos es muy buena. |
| 19. Extensibilidad controlada | OK | 4/5 | Arquitectura permite añadir juegos/sistemas sin romper el core. |
| 20. Claridad temporal/espacial | OK | 4/5 | Uso de `localTick` y snapshots en multiplayer bien planteado. |

---

### 3. Hallazgos prioritarios

#### Hallazgo 1: Divergencia en integración física
- **Severidad:** Alta
- **Evidencia:** `AsteroidsGame.ts` implementa integración de Euler manual en `predictLocalPlayer`, mientras que `src/game/GameEngine.tsx` usa `MatterPhysicsAdapter`.
- **Por qué importa:** Mantener dos formas de resolver física (manual vs motor) aumenta la deuda técnica y dificulta la implementación de colisiones complejas de forma uniforme.
- **Recomendación:** Formalizar el uso de un "SimplePhysicsSystem" para juegos arcade y reservar Matter.js para simulaciones de cuerpos rígidos, pero ambos bajo la misma interfaz `IPhysicsAdapter`.

#### Hallazgo 2: Fuga de determinismo por aleatoriedad no controlada
- **Severidad:** Media
- **Evidencia:** `PongGameStateSystem.ts` usa `Math.random()` en `resetBall`. `AsteroidsSkiaVisuals.ts` usa `Math.random()` para el efecto de estrellas.
- **Por qué importa:** Impide la implementación fiable de replays y puede causar desincronización en multiplayer autoritativo si la semilla no se comparte.
- **Recomendación:** Migrar todo uso de aleatoriedad al `RandomService` (Mulberry32) inyectando una semilla por partida/sesión.

#### Hallazgo 3: Presión de GC en el Render Snapshot
- **Severidad:** Media
- **Evidencia:** En `src/game/GameEngine.tsx`, se mapean todas las entidades a un nuevo array de objetos cada frame en `useFrameCallback`.
- **Por qué importa:** En React Native, la creación masiva de objetos efímeros en cada frame (60 veces por segundo) dispara el Garbage Collector, causando micro-stuttering (tirones) en dispositivos móviles.
- **Recomendación:** Implementar un pool de objetos para el snapshot o usar `SharedValue` de Reanimated de forma que solo se actualicen propiedades escalares en buffers pre-asignados.

---

### 4. Deriva hacia pensamiento web/app
Se detecta en `src/components/GameEngine.tsx` el uso de `setVersion(v => v + 1)` disparado por `subscribeRender`.
- **Problema:** Forzar un re-render de React cada frame es un antipatrón en motores de juego de alto rendimiento. React debe usarse para el HUD y menús, no para orquestar el renderizado del canvas.
- **Corrección:** El `GameCanvas` de Skia debería reaccionar a cambios en `SharedValues` o refs, eliminando la necesidad de que el componente padre de React se actualice por cada tick del loop.

---

### 5. Calidad del núcleo del juego
- **Loop:** Excelente implementación con acumulador y fixed timestep en `GameLoop.ts`.
- **Estado:** Uso correcto de singletons en el `World` para estado global de juego.
- **Input:** Desacoplamiento total mediante `UnifiedInputSystem`, muy robusto.
- **Timing:** Controlado correctamente mediante `deltaTime`.

---

### 6. Calidad de la capa de UI y app shell
- **HUD/Menús:** Bien aislados. Se comunican con el motor mediante lectura de estado, cumpliendo con el Principio 11.
- **Navegación:** Expo Router se usa correctamente para transiciones entre juegos sin interferir en la lógica interna de los mismos.

---

### 7. Testabilidad y cobertura útil
- La lógica crítica de los sistemas (Movimiento, Colisiones, GameState) está cubierta por tests en Jest que corren fuera del entorno de UI. Esto es excelente para la estabilidad a largo plazo.
- **Área a mejorar:** Tests de integración para el `CollisionRouter` con Matter.js y validación de determinismo del `RandomService`.

---

### 8. Riesgos de rendimiento
- **Rerender innecesario:** Confirmado en `GameEngine.tsx` vía `setVersion`.
- **Asignaciones por frame:** Elevadas en la generación de snapshots de renderizado.
- **Acoplamiento:** El `StarField.ts` depende de tipos específicos de Asteroids, lo cual es una fuga de abstracción.

---

### 9. Acciones recomendadas

- **Hacer hoy:**
  1. Unificar el uso de `RandomService` en `PongGameStateSystem.ts` y eliminar `Math.random()`.
  2. Envolver `deactivateKeepAwake()` en `try/catch` (detectado como riesgo en memoria previa).
- **Hacer esta semana:**
  1. Refactorizar el snapshot de renderizado en `GameEngine.tsx` para evitar la creación de arrays/objetos nuevos cada frame.
  2. Extraer la lógica de estelas (trails) de `AsteroidRenderSystem` a un `TrailSystem` genérico en el core del motor.
- **Hacer más adelante:**
  1. Unificar los adaptadores de física bajo una arquitectura que permita intercambiar Matter.js por un integrador ligero de forma transparente para los sistemas.

---

### 10. Prompt de seguimiento para el próximo día
"Revisar el progreso en la eliminación de `Math.random()` en los sistemas de gameplay y verificar si se ha optimizado el puente de comunicación entre el GameLoop y la UI de React para reducir la presión sobre el GC y los re-renders innecesarios."

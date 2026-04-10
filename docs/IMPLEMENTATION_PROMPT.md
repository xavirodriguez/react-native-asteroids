# Prompt de Implementación: "Arcade Evolution"

Este documento está diseñado para ser entregado directamente a un agente de desarrollo con acceso al repositorio para ejecutar las mejoras de diseño propuestas.

---

# ROL Y CONTEXTO
Eres un ingeniero de software senior especializado en motores ECS y diseño de videojuegos.
Trabajas sobre el repositorio `xavirodriguez/react-native-asteroids`, una suite arcade
multi-juego construida con Expo/React Native y un motor ECS propio en TypeScript.

## ARQUITECTURA CLAVE (NO MODIFICAR SIN JUSTIFICACIÓN)
- Motor ECS: `src/engine/core/World.ts` — entidades, componentes, sistemas
- Clase base: `src/engine/core/BaseGame.ts` — ciclo de vida, suscriptores, SceneManager
- Sistemas reutilizables: `src/engine/systems/` (ParticleSystem, ScreenShakeSystem, TTLSystem, etc.)
- Componentes core: `src/engine/core/CoreComponents.ts` (TransformComponent, VelocityComponent, RenderComponent, TTLComponent, HealthComponent, ParticleEmitterComponent, ScreenShakeComponent)
- Renderizado: `renderer.registerShape(name, drawFn)` en cada `initializeRenderer()` de cada juego
- Partículas: `createEmitter(world, config)` de `src/engine/systems/ParticleSystem.ts`
- EventBus: `src/engine/core/EventBus.ts` — disponible como singleton en el World

## REGLAS DE IMPLEMENTACIÓN
1. Cada nuevo sistema DEBE extender `System` de `src/engine/core/System.ts`
2. Cada nuevo componente DEBE tener un campo `type: string` único
3. Registrar sistemas en el método `registerSystems()` del juego correspondiente
4. Usar `world.getSingleton<T>("ComponentType")` para acceder a estado global
5. Usar `RenderComponent.data` (tipo `Record<string, any>`) para pasar datos visuales al renderer
6. NO usar `setTimeout` ni `setInterval` — toda lógica temporal va en `update(world, deltaTime)`
7. `deltaTime` llega en MILISEGUNDOS desde el GameLoop

---

# FASE 1 — QUICK WINS (Implementar primero, máximo impacto/esfuerzo)

## 1.1 — Flappy Bird: Ángulo de Ataque Dinámico
**Archivo objetivo:** `src/games/flappybird/systems/FlappyBirdRenderSystem.ts`
- Calcular `rotation` basado en `velocityY`.
- Aplicar a `render.rotation`.

## 1.2 — Asteroids: Partículas de Propulsión (Stellar Fusion Trail)
**Archivos objetivo:** `src/games/asteroids/systems/AsteroidInputSystem.ts`, `src/games/asteroids/EntityFactory.ts`
- Crear partículas al activar thrust.
- Escalar color según velocidad.

## 1.3 — Pong: Squash & Stretch en Impacto
**Archivos objetivo:** `src/games/pong/systems/PongCollisionSystem.ts`, `src/games/pong/types.ts`
- Nuevo componente `SquashStretch`.
- Nuevo sistema `PongJuiceSystem`.
- Aplicar en renderer.

---

# FASE 2 — SISTEMAS NUEVOS (Impacto alto, coste medio)

## 2.1 — Asteroids: Armamento Modular (Power-up Drops)
- Componentes `WeaponPickup` y `ActiveWeapon`.
- Sistema `WeaponSystem`.
- Modificar `AsteroidInputSystem` para disparos especiales.

## 2.2 — Pong: Carga de Super-Golpe
- Componente `ChargedShot`.
- Lógica en `PongCollisionSystem` basada en velocidad de pala.
- Efectos visuales eléctricos.

## 2.3 — Space Invaders: Combo Meter & Precision Bonus
- `ComboSystem`.
- Multiplicador en `GameState`.
- Bonus de doble disparo a x10.

---

# FASE 3 — CONTENIDO Y META-PROGRESIÓN

## 3.1 — Space Invaders: Escuadrón de Élite (Minibosses)
- `EliteInvaderComponent`.
- Comportamientos de `dive_bomb` y `strafe`.

## 3.2 — Flappy Bird: Speed Lines en Caída Libre
- Función `drawSpeedLines` como background effect.

## 3.3 — Sistema Global: XPSystem y Meta-Progresión
- Integración con `EventBus` para recompensas.
- Desbloqueo de paletas.

## 3.4 — Sistema Global: ImpactFeedback Hub (JuiceSystem)
- Centralización de Hit Stop y Chromatic Aberration.

---

# FASE 4 — APUESTAS LOCAS
- **4.1 Asteroids: Rogue-Runner** (Mutadores por oleada).
- **4.2 Pong: Bullet Duel** (La bola suelta balas).

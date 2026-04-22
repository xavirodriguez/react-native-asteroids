He revisado el contrato público de `asteroides.d.ts`. No he visto la implementación real, así que algunas conclusiones son inferencias del API, pero la dirección arquitectónica se ve bastante clara.

Hay varios síntomas objetivos en la superficie pública:

* El entrypoint raíz mezcla demasiado: ECS, render, escenas, input, networking, replay, assets y compatibilidad legacy.
* El barrel principal importa `react-native-reanimated` y `@shopify/react-native-skia` desde arriba del todo, así que el contrato canónico ya nace acoplado a plataforma.
* `Query.getEntities()` devuelve una referencia a caché interno; el `ReadonlyArray` solo documenta intención, no protege la estructura.
* `World.getComponent()` y especialmente `World.getSingleton()` dejan la puerta abierta a mutaciones implícitas; este último incluso puede tener side effects.
* `World.version` está sobrecargado: sirve para cambios estructurales, para “forzar render” y para sincronización general.
* `CanvasRenderer` ya va por snapshots, pero `SkiaRenderer` aún no tiene paridad completa de modelo.
* El lifecycle está repartido entre `BaseGame`, `SceneManager` y `Scene`, y además conviven métodos ya marcados como deprecated.

Mi lectura es esta: ahora mismo el motor intenta ser a la vez kernel ECS, framework de juego, framework de plataforma y base determinista. Eso casi siempre termina en una API grande, ambigua y difícil de endurecer.

## 1) Reducir el engine a un core estable

### Solución A: monolito modular con subpath exports

Mantienes un solo repo y un solo paquete, pero separas físicamente y en exports:

* `core`
* `gameplay`
* `physics2d`
* `presentation`
* `app`
* `legacy`

El root exporta solo el core estable y quizá un runtime mínimo. Todo lo demás entra por subpaths.

**Ventaja:** el coste de migración es razonable.
**Desventaja:** las fronteras siguen siendo disciplina interna, no aislamiento total de package manager.

### Solución B: workspace con varios paquetes

`@engine/core`, `@engine/gameplay`, `@engine/physics2d`, `@engine/presentation`, `@engine/app`, `@engine/legacy`.

**Ventaja:** la frontera queda muy clara y el versionado puede ser más fino.
**Desventaja:** más fricción de build, tests, release y tooling.

### Solución C: extraer un kernel puro y dejar el resto como framework

Sacaría un `ecs-kernel` realmente pequeño y estable, y el resto sería un framework aparte.

**Ventaja:** máxima claridad conceptual.
**Desventaja:** demasiada ruptura para una sola iteración.

### Lo que elegiría

**Solución A ahora**, pero estructurada como si luego pudiera convertirse en la B sin dolor.

### Qué movería

**Core estable**

* `World`
* `Entity`
* `Component`
* `System`
* `SystemPhase`
* `Query` o mejor un `QueryView`
* snapshot del mundo
* command buffer estructural
* fixed-step clock / game loop mínimo

**Gameplay**

* `MovementSystem`
* `FrictionSystem`
* `TTLSystem`
* `BoundarySystem`
* salud
* FSM
* pools/prefabs si están orientados a gameplay

**Physics**

* `Collider2DComponent`
* `PhysicsBody2DComponent`
* `PhysicsSystem2D`
* `CollisionSystem2D`
* `BroadPhase`
* `NarrowPhase`
* `ContinuousCollision`
* shapes y raycasts

**Presentation**

* `RenderComponent`
* `RenderSnapshot`
* `RenderCommand`
* cámara
* animator
* trails
* juice
* shake
* tilemap render
* renderers

**App**

* `BaseGame`
* `Scene`
* `SceneManager`
* `AssetLoader`
* `UnifiedInputSystem`
* networking
* replay
* integración con UI/plataforma

**Legacy**

* todo lo deprecated, sin excepción práctica

Y aquí hay una corrección importante de naming: hoy conviven `CommandBuffer` de render y `WorldCommandBuffer` de ECS. Eso crea ambigüedad conceptual. Yo los dejaría como:

* `RenderCommandBuffer`
* `EcsCommandBuffer` o `StructuralCommandBuffer`

---

## 2) Endurecer la frontera ECS

### Solución A: copias defensivas

Cada query devuelve copia, cada lectura devuelve copia.

**Ventaja:** seguridad sencilla.
**Desventaja:** presión de GC y coste continuo.

### Solución B: API explícita de lectura/escritura/comandos

Separas tres cosas:

* lectura: `readComponent`
* mutación de datos: `mutateComponent`
* mutación estructural: `commands.add/remove/create/destroy`

**Ventaja:** equilibrio muy bueno entre rendimiento y disciplina.
**Desventaja:** requiere migrar sistemas.

### Solución C: borrow model / ECS más académico

Algo estilo préstamos de lectura/escritura o contextos estrictos por sistema.

**Ventaja:** muy sólido.
**Desventaja:** demasiado grande para esta base.

### Lo que elegiría

**Solución B**, con guardas de desarrollo.

### Cambios concretos

1. `World.query(...types)` no debería devolver el array vivo interno.
   Dos alternativas buenas:

   * devolver `QueryView implements Iterable<Entity>`
   * o `querySnapshot(...types): Entity[]` cuando realmente se quiera copia

2. `World.getComponent()` debería pasar a ser de solo lectura:

   ```ts
   const t = world.readComponent<TransformComponent>(e, "Transform");
   ```

3. La escritura debería ser explícita:

   ```ts
   world.mutateComponent<TransformComponent>(e, "Transform", t => {
     t.x += vx * dt;
     t.y += vy * dt;
   });
   ```

4. Las mutaciones estructurales durante `update` deben pasar por command buffer:

   ```ts
   world.commands.removeEntity(e);
   world.commands.addComponent(e, component);
   ```

5. `getSingleton()` no debería tener side effects.
   Lo separaría en:

   * `readSingleton(type)` sin side effects
   * `ensureSingleton(type, factory)` explícito

6. En desarrollo, congelaría snapshots o lecturas readonly para detectar mutaciones ilegales fuera del canal de escritura.

Esto arregla dos problemas a la vez: la frontera ECS y la fiabilidad del versionado.

---

## 3) Elegir una prioridad real

Aquí hay que distinguir entre **qué vendes** y **qué dejas preparado**.

### Opción 1: motor arcade 2D single-player

Es la opción que mejor encaja con lo que ya existe: movimiento, fricción, TTL, partículas, camera shake, tilemap, collision 2D, snapshots de render.

### Opción 2: motor ECS render-agnóstico

Más limpio conceptualmente, pero obliga a sacar mucho valor práctico fuera del centro demasiado pronto.

### Opción 3: base determinista para rollback

No la elegiría como prioridad actual. El propio contrato público ya delata huecos:

* `StateMachineComponent` contiene una FSM opaca
* `World.snapshot()` avisa de riesgos de orden/GC
* hay lifecycle asíncrono
* hubo cámara legacy dependiente de `SharedValue`
* la frontera de mutación todavía no está cerrada

### Opción 4: framework React Native + Skia

Tampoco la elegiría como identidad principal, porque haría secundarios tanto Canvas como el objetivo de un core portable.

### Lo que elegiría

**Prioridad de producto: motor arcade 2D single-player.**
**Principio de arquitectura: ECS modular y presentation por snapshots.**
**No objetivo por ahora: rollback-first real.**
**Soporte de RN + Skia: adaptador, no identidad del engine.**

Es la decisión más coherente y con mejor coste/beneficio.

---

## 4) Sacar legacy de la superficie principal

### Solución A: dejar deprecated en root

No resuelve el problema.

### Solución B: submódulo `legacy`

Todo lo deprecated vive ahí. El root deja de exportarlo.

### Solución C: borrado duro inmediato

Solo la haría si no hay consumidores internos o si aceptas una major agresiva.

### Lo que elegiría

**Solución B ahora** y preparar la C para la siguiente major.

### Qué movería a `legacy`

* `Legacy` namespace completo
* `CameraSystem`
* `InputManager`
* `KeyboardController`
* `TouchController`
* `PositionComponent`
* `ColliderComponent`
* `LegacyTransform`
* `LegacyScreenShake`
* `World.getEntitiesWith`
* `Scene.update`
* `Scene.render`
* `Renderer.drawEntity`
* campos deprecated como `CollisionManifold.entityA/entityB`

Y además quitaría del barrel principal cualquier símbolo deprecated aunque siga existiendo físicamente.

---

## 5) Simplificar el lifecycle

### Solución A: `BaseGame` como única autoridad

`BaseGame` posee el state machine del lifecycle. `SceneManager` solo gestiona stack/transiciones de escena. `Scene` solo recibe hooks.

### Solución B: `SceneManager` como autoridad

No me convence porque `init/start/stop` viven más arriba.

### Solución C: nuevo `RuntimeController`

Es elegante, pero añade otra pieza pública más.

### Lo que elegiría

**Solución A**. Es la menos disruptiva y la más clara para consumidores.

### Modelo recomendado

`BaseGame` controla:

* `init`
* `start`
* `stop`
* `pause`
* `resume`
* `restart`
* `destroy`

`SceneManager` deja de ser una segunda autoridad del lifecycle; pasa a ser un helper de transición.
`Scene` queda reducida a hooks:

* `onEnter`
* `onExit`
* `onPause`
* `onResume`
* `onUpdate`

Yo sacaría a legacy o eliminaría del flujo principal:

* `Scene.init`
* `Scene.restart`
* `Scene.update`
* `Scene.render`
* `onRestartCleanup`

### Semántica de restart

`restart` debe significar una sola cosa:

1. parar simulación
2. salir de la escena activa
3. resetear mundo/clock/versiones
4. re-entrar en escena
5. reanudar si corresponde

No una mezcla de “a veces reinicio escena, a veces limpio mundo, a veces reutilizo instancia”.

También añadiría un state machine explícito, por ejemplo:

* `Uninitialized`
* `Initializing`
* `Ready`
* `Running`
* `Paused`
* `Restarting`
* `Stopped`
* `Destroyed`

Y con eso:

* `start()` antes de `init()` falla de forma explícita
* `pause()` y `resume()` son idempotentes
* `restart()` se serializa; no se solapa

---

## 6) Separar “state version”, “render dirty” y “tick”

### Solución A: solo renombrar `version`

Insuficiente.

### Solución B: separar cuatro conceptos

* `tick`
* `stateVersion`
* `structureVersion`
* `renderDirty`

### Solución C: solo eventos

Más difícil de razonar y depurar.

### Lo que elegiría

**Solución B**.

### Modelo concreto

**`tick`**
Contador de simulación fija. Solo avanza una vez por fixed update.

**`structureVersion`**
Cambia solo cuando cambia la topología ECS:

* create entity
* destroy entity
* add component
* remove component

Las queries deben invalidarse con esto, no con otra cosa.

**`stateVersion`**
Cambia cuando cambia estado observable del mundo, aunque no cambie la estructura:

* posición
* salud
* velocidad
* timers
* recursos globales si forman parte del estado de juego

**`renderDirty`**
Bandera o epoch de invalidación visual. Se activa cuando cambia algo que requiere nueva captura visual:

* transform
* render
* visual offset
* trails
* animator
* cámara
* shake
* etc.

Yo haría `renderDirty` como bandera y, si necesitas tracing fino, un `renderVersion` interno.

### Implicación importante

Esto solo funciona de verdad si cierras la escritura mediante `mutateComponent`.
Mientras existan referencias mutables escapando por `getComponent()`, ningún contador será fiable.

---

## La combinación que recomiendo

En conjunto, elegiría esta ruta:

1. **Posicionamiento**: motor arcade 2D single-player.
2. **Arquitectura**: monolito modular con subpath exports.
3. **Root surface**: pequeño y estable; sin RN/Skia ni legacy.
4. **ECS**: lectura readonly, mutación explícita, estructura vía command buffer.
5. **Lifecycle**: `BaseGame` como autoridad única.
6. **Versionado**: `tick`, `stateVersion`, `structureVersion`, `renderDirty`.
7. **Legacy**: fuera del root, en `legacy`.
8. **Render**: converger ambos renderers al modelo de snapshot, aunque la interfaz pública se pueda migrar en dos pasos.

Con esto consigues algo muy importante: el motor deja de ser “una colección grande de cosas útiles” y pasa a tener un **centro semántico** claro.

---

## Prompt para Jules

```text
Actúa como un principal software engineer especializado en game engines ECS, TypeScript APIs y refactors arquitectónicos incrementales.

Tu misión es refactorizar este repositorio para que el engine quede enfocado y estable como:
- producto principal: motor arcade 2D single-player
- principio arquitectónico: ECS modular con presentation desacoplada
- NO objetivo actual: base rollback-first completa
- React Native + Skia debe quedar como adaptador/plataforma, no como identidad del core

Contexto conocido del contrato público actual:
- El barrel principal mezcla ECS, render, escenas, input, assets, networking, replay y legacy.
- El entrypoint público importa tipos de `react-native-reanimated` y `@shopify/react-native-skia`, lo que acopla la superficie canónica a plataforma.
- `Query.getEntities()` expone un array cacheado interno.
- `World.getComponent()` y especialmente `World.getSingleton()` dejan escapar mutabilidad; `getSingleton()` incluso puede tener side effects.
- `World.version` está sobrecargado para varias funciones.
- Existen dos command buffers con semánticas distintas (`CommandBuffer` de render y `WorldCommandBuffer` estructural).
- Hay lifecycle repartido entre `BaseGame`, `SceneManager` y `Scene`.
- Hay símbolos deprecated aún visibles en la superficie principal.

Antes de editar:
1. Inspecciona el repo real y localiza las implementaciones efectivas de:
   - World
   - Query
   - BaseGame
   - Scene
   - SceneManager
   - GameLoop
   - renderers
   - legacy exports
2. Identifica el barrel público principal y los sub-barrels si existen.
3. Identifica todos los juegos internos y consumidores del engine dentro del repo.
4. Haz un plan de migración de imports y ejecútalo dentro del mismo cambio.

Objetivos de implementación:

A. Reducir el engine a un core estable
- Reorganiza el código en módulos claros:
  - core
  - gameplay
  - physics2d
  - presentation
  - app
  - legacy
- El root public barrel debe exportar solo la superficie estable del core (y como mucho runtime mínimo si realmente es esencial).
- Todo lo no-core debe salir por subpath exports, por ejemplo:
  - package/gameplay
  - package/physics2d
  - package/presentation
  - package/app
  - package/legacy
- El root barrel NO debe importar ni depender de `react-native-reanimated` ni de `@shopify/react-native-skia`.
- Si hoy `BaseGame` está en el root, muévelo a `app` salvo que haya una razón técnica fuerte para dejarlo; documenta la decisión.

B. Endurecer la frontera ECS
- Elimina la exposición de arrays internos mutables de queries.
- Sustituye el patrón actual por una API segura. Acepto cualquiera de estas dos:
  1) `QueryView` iterable sin exponer el array interno
  2) métodos `queryView()` / `querySnapshot()` con semánticas explícitas
- `World.getComponent()` no debe seguir siendo la vía normal de mutación.
- Introduce una API explícita de lectura/escritura:
  - `readComponent`
  - `mutateComponent` o equivalente
- La mutación estructural durante update debe pasar únicamente por un command buffer estructural explícito:
  - `world.commands.createEntity`
  - `world.commands.removeEntity`
  - `world.commands.addComponent`
  - `world.commands.removeComponent`
  o equivalente
- Si hay APIs antiguas como `createEntity`, `removeEntity`, `addComponent`, `removeComponent` que mutan directamente durante update, conviértelas en wrappers seguros o restrínjelas fuera de update.
- Elimina side effects implícitos de `getSingleton()`. Sepáralo en lectura pura y creación/ensure explícita.
- Añade guardas de desarrollo para detectar mutaciones ilegales fuera del canal de escritura.

C. Elegir una prioridad real y alinear la API
- Alinea documentación, comentarios y nombres con la prioridad elegida: arcade 2D single-player.
- No vendas determinismo/rollback fuerte donde el engine todavía no lo garantiza.
- Si existen claims de rollback-ready o determinismo estricto que no se sostienen, rebájalos a “deterministic-friendly” o “experimental” según corresponda.
- Mantén Canvas y Skia como adapters de presentation, no como razón de ser del core.

D. Sacar legacy de la superficie principal
- Mueve todos los símbolos deprecated y adaptadores de compatibilidad a `legacy`.
- El root barrel no debe reexportar nada deprecated.
- Conserva compatibilidad razonable mediante `package/legacy`, no mediante root exports.
- Migra a legacy, entre otros, si existen con estos o parecidos nombres:
  - Legacy namespace
  - CameraSystem legacy
  - InputManager / KeyboardController / TouchController antiguos
  - PositionComponent
  - ColliderComponent
  - LegacyTransform
  - LegacyScreenShake
  - World.getEntitiesWith
  - Scene.update / Scene.render públicos legacy
  - Renderer.drawEntity
  - campos deprecated en collision manifolds
- Añade `MIGRATION.md` con el mapeo old -> new.

E. Simplificar lifecycle
- `BaseGame` debe quedar como autoridad única del lifecycle público:
  - init
  - start
  - stop
  - pause
  - resume
  - restart
  - destroy
- `SceneManager` debe quedar como helper de stack/transición de escenas, no como segunda autoridad del lifecycle público.
- `Scene` debe reducirse a hooks simples:
  - onEnter
  - onExit
  - onPause
  - onResume
  - onUpdate
- Elimina, mueve a legacy o deja fuera del flujo principal:
  - Scene.init
  - Scene.restart
  - Scene.update público legacy
  - Scene.render público legacy
  - onRestartCleanup
  salvo que haya una razón de compatibilidad realmente necesaria, en cuyo caso debe vivir en legacy.
- Implementa un state machine explícito para el lifecycle de BaseGame:
  - Uninitialized
  - Initializing
  - Ready
  - Running
  - Paused
  - Restarting
  - Stopped
  - Destroyed
  o una variante equivalente bien definida
- `start()` antes de `init()` debe fallar de forma explícita o ser ignorado con contrato claro.
- `pause()` / `resume()` deben ser idempotentes.
- `restart()` no debe poder solaparse consigo mismo; serializa la operación.

F. Separar `stateVersion`, `renderDirty` y `tick`
- Elimina la semántica sobrecargada de `World.version`.
- Introduce al menos:
  - `stateVersion`
  - `structureVersion`
  - `renderDirty`
  - `tick` (en runtime/clock o donde mejor encaje)
- Reglas:
  - `tick` avanza solo en fixed update
  - `structureVersion` cambia solo con cambios topológicos ECS
  - `stateVersion` cambia con mutaciones reales del estado del mundo
  - `renderDirty` se marca por cambios que exigen nueva captura/render
- Las queries deben invalidarse por `structureVersion`, no por `stateVersion`.
- El pipeline de render debe usar `renderDirty`/snapshot invalidation en vez de abusar de `World.version`.
- Si hoy algún sistema de presentation incrementa `World.version` para forzar re-render, reemplázalo por la nueva semántica.

G. Aclarar naming confuso de command buffers
- Renombra el `CommandBuffer` de render a `RenderCommandBuffer` o nombre equivalente.
- Expón el command buffer estructural con un nombre inequívoco tipo `EcsCommandBuffer` o `StructuralCommandBuffer`.
- Actualiza imports, docs y juegos internos.

H. Actualizar los juegos internos
- Migra todos los juegos internos del repo a la nueva API.
- No dejes consumers internos usando root legacy imports si existe una ruta moderna.
- Si hace falta compatibilidad, úsala solo en `legacy` y deja comentado el motivo.

I. Tests y validación
Añade o actualiza tests para cubrir como mínimo:
1. Query no expone arrays internos mutables.
2. Las mutaciones estructurales durante update se difieren y aplican por command buffer.
3. `getSingleton` ya no tiene side effects implícitos.
4. `stateVersion`, `structureVersion`, `renderDirty` y `tick` cambian de forma independiente y correcta.
5. `BaseGame` lifecycle:
   - start antes de init
   - pause/resume idempotentes
   - restart serializado
6. El root barrel compila sin requerir dependencias RN/Skia para usuarios del core.
7. Los imports deprecated no salen por el root barrel.

Entregables obligatorios:
- Código refactorizado y compilando
- Tests pasando
- `ARCHITECTURE.md` actualizado
- `MIGRATION.md` actualizado
- Resumen final de:
  - módulos creados/movidos
  - breaking changes reales
  - compat shims conservados en `legacy`
  - juegos internos migrados
  - tests ejecutados

Restricciones:
- No hagas una reescritura teórica; refactor incremental y coherente.
- No dejes TODOs abiertos para piezas centrales de esta migración.
- Si la implementación real difiere del contrato público conocido, adapta los nombres pero conserva la intención arquitectónica.
- Prioriza claridad semántica, compatibilidad razonable y reducción de complejidad accidental.
- Donde haya que elegir entre preservar una API ambigua y dejar una API correcta, prefiere la correcta y deja shim en `legacy`.
```

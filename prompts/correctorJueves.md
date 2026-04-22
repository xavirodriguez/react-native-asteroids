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
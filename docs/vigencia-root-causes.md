# 🔍 Investigación de Vigencia: ROOT_CAUSES.md vs. Código Fuente Actual

Este documento presenta una auditoría técnica detallada sobre la vigencia de las 5 causas raíz descritas en `ROOT_CAUSES.md`, confrontándolas directamente con el estado actual del código en el monorepo `react-native-asteroids`.

---

## 1. Tabla Resumen de Diagnósticos

| Punto de ROOT_CAUSES.md | Veredicto | Evidencia (Archivo:Línea) | Nota Breve |
| :--- | :---: | :--- | :--- |
| **1. Ciclo de Vida Inconsistente de BaseGame** | **(C) Obsoleto / Resuelto** | `BaseGame.ts:167-171, 182-198`<br>`Schedule.ts:44-47`<br>`docs/KNOWN_ISSUES.md` (BUG-001) | La limpieza total de `EventBus`, la llamada en cascada de `dispose()` sobre todos los sistemas de `Schedule`, y la reinstanciación del `World` resuelven por completo las fugas de memoria en `restart()`. |
| **2. Acoplamiento Excesivo entre Core y App/Plataforma** | **(C) Obsoleto / Resuelto** | `packages/core/package.json`<br>`packages/core/src/index.ts`<br>`server/package.json` | El core no posee dependencias a `react-native-reanimated` ni `@shopify/react-native-skia`. El servidor headless compila y ejecuta tests de forma totalmente nativa y sin mocks. |
| **3. Abuso de Recursos y Singletons con Efectos Secundarios** | **(B) Parcialmente Resuelto** | `World.ts:326-340` (`getComponent`)`World.ts:503-507` (`getSingleton`)`World.ts:360-372` (`getMutableComponent`) | Se implementaron mutaciones protegidas e incrementos de `stateVersion` con un `Object.freeze` superficial en modo `__DEV__`. No obstante, la protección es superficial y no previene la mutación de propiedades anidadas. Además, `getSingleton` no tiene efectos secundarios ni carga perezosa como decía el documento original. |
| **4. ECS Insuficientemente Tipado y Estructuras Internas** | **(C) Obsoleto / Resuelto** | `Query.ts:70-79`<br>`World.ts:175-180`<br>`packages/core/src/` (búsquedas `: any`) | `Query.getEntities()` clona la estructura y la congela en `__DEV__`. El uso de `any` no está generalizado en hot paths, limitándose a factorías de juegos, serializadores o integraciones de red. |
| **5. Duplicación de Lógica y Falta de Abstracción** | **(B) Parcialmente Resuelto** | `packages/core/src/games/arcade/`<br>`SpaceInvadersCollisionSystem.ts:101-115`<br>`SpaceInvadersGameStateSystem.ts:40-52` | Existe un módulo común `arcade/` para lógica de combos y loot, y se aclaró que `AsteroidComboSystem` no existe (la clase real es `ComboSystem`). Sin embargo, persiste acoplamiento y duplicación en la sincronización local y fórmulas de combos en cada juego. |

---

## 2. Detalle de los Hallazgos por Punto

### Punto 1 — Ciclo de Vida Inconsistente de `BaseGame`
**Veredicto:** **(C) Obsoleto / Ya resuelto**

El análisis del código fuente desmiente que el ciclo de vida de `BaseGame` sea inconsistente o provoque fugas de memoria por listeners acumulados en el reinicio. El método `BaseGame.destroy()` (en `packages/core/src/runtime/BaseGame.ts`, líneas 167-171) detiene el loop de juego, limpia explícitamente los sistemas de la planificación (`world.schedule.clearSystems()`), limpia el `EventBus` (`eventBus.clear()`), y desecha la entrada unificada (`unifiedInput.dispose()`).

Al llamar a `BaseGame.restart()` (líneas 182-198), se ejecuta primero `this.destroy()`, garantizando la desconexión total. Posteriormente, se invoca un segundo `this.eventBus.clear()`, se reinstancia la propiedad `world` mediante `new World(...)` (eliminando la instancia anterior y permitiendo su recolección de basura por completo), y se recrea el `SceneManager`.

La liberación de recursos en cascada sobre todos los sistemas de la simulación descartada funciona correctamente. El método `Schedule.clearSystems()` (en `packages/core/src/ecs/Schedule.ts`, líneas 44-47) recorre la lista interna de sistemas ejecutando el método `system.dispose()` de cada uno de ellos de manera secuencial antes de vaciar la colección.

Por último, el issue `BUG-001` (descrito en `docs/KNOWN_ISSUES.md` como "AsteroidComboSystem acumula listeners en restart") se reporta oficialmente como **Cerrado**. La solución aplicada de limpiar el `EventBus` y regenerar el `World` de forma limpia elimina de raíz cualquier acumulación de closures de listeners de mundos antiguos.

---

### Punto 2 — Acoplamiento Excesivo entre Core y App / Plataforma
**Veredicto:** **(C) Obsoleto / Ya resuelto**

No existe evidencia alguna de dependencias acopladas ni de imports nativos o móviles dentro de `@tiny-aster/core`. La inspección del archivo de configuración `packages/core/package.json` demuestra la total ausencia de las bibliotecas `react-native-reanimated` y `@shopify/react-native-skia` en sus dependencias de producción o desarrollo.

Asimismo, búsquedas exhaustivas a lo largo de todo el árbol de código fuente de `packages/core/src/` confirman que no hay ningún tipo de importación (directa o transitiva) de estas librerías. El motor central (`@tiny-aster/core`) ha completado su desacoplamiento de la presentación nativa, delegando el renderizado a adaptadores independientes (por ejemplo, en `packages/renderer-skia/`).

Como consecuencia de este diseño modular, el servidor headless de Asteroids en `server/` logra compilarse mediante `pnpm exec tsc` y ejecutar sus pruebas unitarias en Jest sin requerir ningún tipo de mock de React Native ni dependencias pesadas de Skia, cumpliendo perfectamente la promesa de un motor portable para simulaciones multijugador autoritativas en Node.js.

---

### Punto 3 — Abuso de Recursos y Singletons Globales con Efectos Secundarios
**Veredicto:** **(B) Está parcialmente resuelto**

Este punto representa el mayor contraste entre la literatura descriptiva de `ROOT_CAUSES.md` y la realidad física del código actual, encontrándose en un estado de resolución intermedia:

- **Mecanismos de protección ya implementados:** El método `World.getComponent()` (en `packages/core/src/ecs/World.ts`, líneas 326-340) aplica un congelamiento superficial de solo lectura (`Object.freeze(component)`) cuando el motor corre en modo `__DEV__`. La API de lectura estricta `World.readComponent()` (líneas 348-358) actúa de igual forma. Para modificar propiedades sin disparar un `TypeError`, los sistemas deben usar obligatoriamente la API de mutación protegida `World.mutateComponent()` o `World.getMutableComponent()` (líneas 360-372). Este último comprueba si el componente está congelado (`Object.isFrozen`) y, de ser así, delega en `ComponentCloner.cloneComponent()` su clonación profunda antes de incrementar el `_stateVersion` del mundo, notificando correctamente al serializador de red.
- **Por qué la vigencia es parcial:**
  1. **Congelamiento Superficial (Shallow Freeze):** La advertencia del código en `World.ts` lo indica explícitamente: el congelamiento en `__DEV__` es superficial por razones de rendimiento. Mutaciones en propiedades y arrays anidados dentro de componentes obtenidos por `getComponent()` siguen siendo viables y no lanzarán errores de runtime, lo que representa una brecha de seguridad en la inmutabilidad.
  2. **Inicialización perezosa desmitificada:** Contrario a lo que describe `ROOT_CAUSES.md`, la implementación real de `World.getSingleton()` (líneas 503-507) es una envoltura simple de lectura libre de efectos secundarios sobre `query(type)` y `getComponent()`. No se realiza ninguna inicialización implícita ni perezosa en este nivel del motor.

---

### Punto 4 — ECS Insuficientemente Tipado y Exposición de Estructuras Internas
**Veredicto:** **(C) Obsoleto / Ya resuelto**

El riesgo de corrupción interna por la manipulación de arrays vivos expuestos por queries ha sido totalmente neutralizado:

El método `Query.getEntities()` (en `packages/core/src/ecs/Query.ts`, líneas 70-79) no expone el Set interno `this.entities`. En su lugar, cuando el query se encuentra sucio (`this.isDirty`), realiza una copia de los elementos convirtiéndolos en un nuevo array ordenado de entidades (`this.sortedEntities = Array.from(this.entities).sort(...)`). En modo `__DEV__`, aplica inmediatamente `Object.freeze()` sobre dicho array antes de retornarlo. Del mismo modo, la propiedad general `World.entities` (en `packages/core/src/ecs/World.ts`, líneas 175-180) genera una copia del Set de entidades activas, protegiendo las referencias estructurales.

Respecto al uso de tipos imprecisos, el ECS de `@tiny-aster/core` hace un uso exhaustivo de genéricos fuertemente tipados (`TComponents`, `TEvents`) en sus clases principales de `World`, `Query` y `System`. El análisis de la prevalencia de `: any` mediante grep revela que su utilización es mínima (alrededor de 39 coincidencias) y está restringida a adaptadores de transporte de red genéricos, deserializadores SoA de snapshots de bajo nivel, o constructores utilitarios de factorías en minijuegos, descartando que exista un "uso generalizado" en los flujos principales de actualización del ECS.

---

### Punto 5 — Duplicación de Lógica y Falta de Abstracción entre Juegos
**Veredicto:** **(B) Está parcialmente resuelto**

La existencia del módulo `packages/core/src/games/arcade/` introduce abstracciones reutilizables como `ComboSystem.ts`, `LootSystem.ts` y `PowerUpSystem.ts`, junto con los componentes compartidos correspondientes. Esto demuestra un esfuerzo real por consolidar comportamientos compartidos en la capa de simulación arcade.

Adicionalmente, se confirma que el nombre de la clase `AsteroidsComboSystem` referenciado en `ROOT_CAUSES.md` **no existe** en la base de código actual; el sistema genérico en producción es `ComboSystem` (definido en `ComboSystem.ts`), por lo que la referencia histórica de este punto está desactualizada.

Sin embargo, **persiste una vigencia parcial de duplicación y acoplamiento**:
Aunque el motor proporciona el componente `"Combo"` genérico y `ComboSystem` para decrementar tiempos en el core, los juegos individuales continúan implementando su lógica de negocio de manera ad-hoc e intrusiva. Por ejemplo:
- `SpaceInvadersGameStateSystem` (en `SpaceInvadersGameStateSystem.ts`, líneas 40-52) debe sincronizar manualmente los campos de combo genéricos del core con su propio `GameStateComponent` local en cada tick para fines de renderizado.
- `SpaceInvadersCollisionSystem` (en `SpaceInvadersCollisionSystem.ts`, líneas 101-115) calcula y aplica las fórmulas del combo de forma aislada y acoplada (`c.combo++`, incremento del multiplicador basado en una constante local, etc.) en lugar de delegar el cálculo del puntaje acumulado en un subsistema abstracto del core. Esto confirma que la duplicación de la fórmula y la sincronización redundante siguen existiendo parcialmente.

---

## 3. Recomendaciones Finales para ROOT_CAUSES.md

Para que el documento `ROOT_CAUSES.md` refleje con precisión la realidad de la deuda técnica sistémica de `react-native-asteroids` hoy, sugerimos la siguiente reescritura:

1. **Punto 1 (Ciclo de Vida de BaseGame):**
   * **Marcar como RESUELTO.** El caso `BUG-001` está cerrado y se ha formalizado una limpieza estricta en cascada de los recursos y el `EventBus` en `restart()`. Este punto ya no representa una prioridad de deuda técnica y puede archivarse o mantenerse como caso de éxito.
2. **Punto 2 (Acoplamiento de Core con Plataforma/App):**
   * **Marcar como RESUELTO a nivel lógico y de dependencias.** El acoplamiento por imports y dependencias de React Native/Reanimated/Skia está completamente eliminado, permitiendo que el server compile sin mocks nativos.
   * **Reescribir como Deuda de Acoplamiento Físico de Juegos:** Reorientar el punto para señalar que la clase de juego `AsteroidsGame` (y sus sistemas de colisiones asociados) sigue residiendo físicamente dentro de `packages/core/src/games/asteroids/` en lugar de estar completamente extraída del paquete del motor central.
3. **Punto 3 (Abuso de Recursos y Singletons):**
   * **Reescribir para detallar la limitación de la inmutabilidad superficial.** Aclarar que la API de mutación protegida (`mutateComponent`, `mutateSingleton`) ya es efectiva y obliga al correcto versionado de estado. Sin embargo, la prioridad técnica actual es mitigar la vulnerabilidad del **shallow freeze** en desarrollo (`Object.freeze`), el cual sigue permitiendo la mutación accidental de subpropiedades de objetos complejos o arrays anidados en componentes devueltos por `getComponent()`.
4. **Punto 4 (ECS Insuficientemente Tipado y Estructuras Internas):**
   * **Marcar como RESUELTO.** `Query.getEntities()` ya protege la inmutabilidad de sus arrays devueltos mediante clonación y congelamiento. El motor actual es robusto, seguro frente a iteraciones simultáneas y cuenta con un sistema de tipos genéricos fuertemente implementado en TypeScript.
5. **Punto 5 (Duplicación de Lógica entre Juegos):**
   * **Mantener como VIGENCIA PARCIAL.** Reconocer la creación del directorio `arcade/` para centralizar `ComboSystem` y `LootSystem`, y corregir la nomenclatura obsoleta de `AsteroidsComboSystem`. No obstante, debe permanecer clasificado como prioridad de deuda técnica debido a que las fórmulas de combo y la sincronización de estados para el renderizado siguen estando duplicadas y acopladas localmente en cada minijuego.

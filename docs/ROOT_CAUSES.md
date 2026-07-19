# 🔍 Root Cause Analysis (ROOT_CAUSES.md)

Este documento detalla los problemas de raíz (root causes) identificados en la arquitectura de **React Native Asteroids**, explicando el origen del endeudamiento técnico de forma sistémica.

---

## 2. 🔌 Deuda de Acoplamiento Físico de Juegos en el Core
* **Síntomas**: `AsteroidsGame` y sus sistemas de colisión asociados siguen residiendo físicamente dentro de `packages/core/src/games/asteroids/`, en lugar de haberse extraído por completo del paquete del motor, pese a que el barrel raíz ya no los re-exporta.
* **Causa Raíz**: La resolución del acoplamiento original se hizo a nivel de superficie de importación (barrels de TypeScript), pero no se completó la migración física de archivos fuera del paquete del motor central (`@tiny-aster/core`).
* **Impacto**: El motor no puede versionarse o publicarse de forma verdaderamente independiente y ligera mientras contenga código de producción y lógica específica de un juego en particular.
* **Nota de Resolución Futura**: Existe una directiva de diseño para esta tarea encaminada a la extracción total física del código de Asteroids.

---

## 3. 🌐 Limitación de Inmutabilidad por Congelamiento Superficial (Shallow Freeze) en __DEV__
* **Síntomas**: Los componentes obtenidos vía `getComponent()` o `readComponent()` se congelan solo superficialmente (`Object.freeze()` shallow) en modo de desarrollo (`__DEV__`). Las propiedades complejas u objetos/arrays anidados dentro de un componente siguen siendo mutables directamente sin pasar por `mutateComponent()`, sin que el runtime de ECS lo detecte ni lance un error.
* **Causa Raíz**: El congelamiento superficial fue una decisión de diseño deliberada para priorizar el rendimiento del loop de actualización y evitar el overhead de un deep-freeze en hot paths, pero introduce una brecha de inmutabilidad en estructuras complejas no protegida en runtime.
* **Aclaración**: Las APIs de mutación protegidas (`mutateComponent`, `mutateSingleton`, `getMutableComponent`) y el control de versiones (`stateVersion`) **sí funcionan correctamente** para mutaciones de primer nivel (este ya no es un problema de "ausencia de protección", sino de la profundidad del congelamiento de seguridad). Además, `getSingleton()` no presenta efectos secundarios ni inicialización perezosa (corrigiendo la descripción histórica).
* **Impacto**: Riesgo real pero sumamente acotado que afecta únicamente a componentes con estructuras de datos complejas/anidadas; no compromete el determinismo ni la replicación de mutaciones simples de primer nivel protegidas por `mutateComponent`.

---

## 👯 5. Duplicación de Lógica y Falta de Abstracción entre Juegos
* **Síntomas**: Aunque se ha unificado la lógica de persistencia y se ha creado una base arcade, persiste la duplicación y el acoplamiento local en la lógica de negocio y cálculo de combos en cada juego particular.
* **Causa Raíz**: Aunque el core proporciona el componente `"Combo"` genérico y el `ComboSystem` para decrementar tiempos, los juegos individuales continúan implementando su lógica de negocio de manera ad-hoc y acoplada localmente en sus sistemas particulares en lugar de definir fórmulas abstractas o delegar en un subsistema común del core.
* **Evidencia de Duplicación**:
  - Se reconoce la existencia de `packages/core/src/games/arcade/` con `ComboSystem`, `LootSystem`, y `PowerUpSystem` como un excelente esfuerzo de abstracción compartida.
  - Se aclara que la nomenclatura histórica `AsteroidsComboSystem`/`AsteroidComboSystem` es obsoleta y no existe físicamente en el repositorio (el sistema real es `ComboSystem`).
  - Ejemplo vigente de duplicación: `SpaceInvadersGameStateSystem` sincroniza manualmente los campos de combo genéricos del core con su propio `GameStateComponent` local en cada tick para fines de renderizado, y `SpaceInvadersCollisionSystem` calcula la fórmula del combo y sus multiplicadores de forma aislada y acoplada (`c.combo++`, incremento basado en constantes locales, etc.).
* **Referencias**: Para un análisis detallado sobre el estado y las propuestas de solución para este acoplamiento de combos, consulte el informe de auditoría detallado en [Investigación de Vigencia de Root Causes](vigencia-root-causes.md).

---

## ✅ Causas Raíz Resueltas

### 1. ⚙️ Ciclo de Vida Inconsistente de `BaseGame`
* **Síntoma original**: Fugas de memoria al reiniciar la simulación, acumulación de event listeners en el `EventBus` (como el reportado en `BUG-001`), y estados zombie de escenas o sistemas físicos.
* **Veredicto**: **(C) Resuelto**.
* **Evidencia**: `BaseGame.ts:167-171, 182-198` y `Schedule.ts:44-47`. El caso `BUG-001` de `KNOWN_ISSUES.md` está oficialmente cerrado. El método `BaseGame.restart()` ahora detiene el loop de juego, destruye y limpia el `EventBus` y los sistemas en cascada, e inicializa un nuevo `World` limpio, previniendo cualquier fuga.

### 2. 🔌 Acoplamiento Excesivo entre Core y App / Plataforma (Imports de Interfaz)
* **Síntoma original**: El barrel principal de `@tiny-aster/core` importaba símbolos de `react-native-reanimated` y `@shopify/react-native-skia`, impidiendo ejecutar el motor headless.
* **Veredicto**: **(C) Resuelto**.
* **Evidencia**: `packages/core/package.json` y `packages/core/src/index.ts`. Se eliminaron todas las dependencias e imports nativos de la UI en el Core, delegando la presentación a adaptadores independientes (como `packages/renderer-skia/`). El servidor headless en `server/` compila y corre tests sin necesidad de mocks nativos.

### 4. 🏷️ ECS Insuficientemente Tipado y Exposición de Estructuras Internas
* **Síntoma original**: El uso generalizado de tipos `any` en hot paths y la devolución de referencias directas al array caché interno en `Query.getEntities()`.
* **Veredicto**: **(C) Resuelto**.
* **Evidencia**: `Query.ts:70-79` y `World.ts:175-180`. `Query.getEntities()` clona la estructura y la congela mediante `Object.freeze` en modo de desarrollo. Se utiliza tipado genérico estricto en el Core; el uso de `: any` se ha reducido a unos 39 casos muy específicos y controlados en adaptadores de red o utilidades de bajo nivel.

---

## 📅 Historial de Revisiones

### Revisión de Vigencia — Febrero 2025
* **Descripción**: Auditoría técnica completa de las causas raíz originales contrastadas con la realidad física del código fuente actual. Se archivaron como resueltos los Puntos 1, 2 (interfaz) y 4. Se actualizó el Punto 3 acotándolo a las limitaciones del shallow freeze, y se recicló el Punto 2 para abordar el acoplamiento físico pendiente de Asteroids. Se integró la investigación del sistema de combos en el Punto 5.
* **Documento de Referencia**: [Investigación de Vigencia: ROOT_CAUSES.md vs. Código Fuente Actual](vigencia-root-causes.md)

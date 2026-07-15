# 🔍 Root Cause Analysis (ROOT_CAUSES.md)

Este documento detalla los problemas de raíz (root causes) identificados en la arquitectura de **React Native Asteroids**, explicando el origen del endeudamiento técnico de forma sistémica.

---

## 1. ⚙️ Ciclo de Vida Inconsistente de `BaseGame`
* **Síntomas**: Fugas de memoria al reiniciar la simulación, acumulación de event listeners en el `EventBus` (como el reportado en `BUG-001`), y estados zombie de escenas o sistemas físicos.
* **Causa Raíz**:
  - La semántica de `restart()` y `destroy()` no estaba completamente formalizada. Al reiniciar, el `EventBus` persistía en la instancia de `BaseGame` sin ser limpiado, lo que causaba que las closures de listeners de sistemas antiguos mantuvieran referencias vivas a mundos ECS anteriores, impidiendo su Garbage Collection.
  - No se realizaba un desmantelamiento explícito de los sistemas ECS de la instancia del `World` desechada.
* **Impacto**: Alta degradación de rendimiento y crashes por falta de memoria tras varios ciclos de reinicio.

---

## 2. 🔌 Acoplamiento Excesivo entre Core y App / Plataforma
* **Síntomas**: El barrel principal de `@tiny-aster/core` importaba símbolos de `react-native-reanimated` y `@shopify/react-native-skia`, lo que hacía inviable ejecutar el motor en un entorno puramente headless (Node.js/Colyseus server) sin mocks pesados o dependencias nativas innecesarias.
* **Causa Raíz**:
  - Falta de abstracción y separación clara de capas en el monorepo. La presentación visual (Skia y Canvas adapters) se trataba como parte del core y no como adaptadores de consumidor final.
* **Impacto**: Mayor fricción al compilar el servidor headless y pérdida de la promesa de un motor modular portable.

---

## 3. 🌐 Abuso de Recursos y Singletons Globales con Efectos Secundarios
* **Síntomas**: `World.getSingleton()` y `World.getComponent()` permitían mutaciones implícitas y directas de propiedades fuera del pipeline formal de comandos o transacciones de mutación.
* **Causa Raíz**:
  - La falta de una API de mutación estrictamente protegida (`mutateComponent` / `mutateSingleton` / `readComponent`) permitió que los desarrolladores modificaran referencias internas devueltas por consultas y queries directos.
  - Métodos como `getSingleton()` realizaban inicializaciones implícitas o perezosas con efectos secundarios no rastreables para simulaciones reproducibles (rollback-ready).
* **Impacto**: Pérdida de predictibilidad matemática y determinismo en el rollback netcode multijugador.

---

## 🏷️ 4. ECS Insuficientemente Tipado y Exposición de Estructuras Internas
* **Síntomas**: El uso generalizado de tipos `any` en los hot paths y queries del ECS, y el hecho de que `Query.getEntities()` devolviera una referencia directa al array caché interno.
* **Causa Raíz**:
  - Exponer arrays vivos para ahorrar asignaciones temporales a costa de la inmutabilidad y la seguridad estructural del ECS. Si un sistema modifica el array de entidades durante su iteración, el estado del ECS se corrompe.
  - Ausencia de tipado genérico fuerte en consultas de componentes y dependencias de sistemas.
* **Impacto**: Bugs silenciosos difíciles de depurar en los bucles de actualización física y colisiones.

---

## 👯 5. Duplicación de Lógica y Falta de Abstracción entre Juegos
* **Síntomas**: Los juegos como Space Invaders y Asteroids reimplementan de forma redundante la detección de combos, el comportamiento de Kamikazes/Ufos, y la gestión de tablas de loot.
* **Causa Raíz**:
  - Ausencia de un módulo `@tiny-aster/gameplay` común que defina comportamientos y componentes modulares compartidos. En su lugar, cada juego creaba sus propios sistemas ad-hoc (`SpaceInvadersCollisionSystem`, `AsteroidCollisionSystem`, etc.) en lugar de reutilizar sistemas genéricos.
* **Impacto**: Mayor costo de mantenimiento, bugs repetidos en múltiples juegos (como la falta de limpieza de listeners que existía tanto en `LootSystem` como en `AsteroidComboSystem`), y mayor dificultad para implementar nuevas características.

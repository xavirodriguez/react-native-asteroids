# 📄 Mision 4: Diagnostic and Architectural Report

Este documento detalla el progreso actual, las dudas de diseño, las decisiones de arquitectura tomadas y los problemas encontrados al migrar los juegos al Core para habilitar el multijugador autoritativo (Headless Server).

---

## 🔍 1. Estado Encontrado (Fase 0)

Al inicio de la sesión se verificó que:
- Los juegos `flappybird`, `pong` y `space-invaders` se encontraban físicamente en la carpeta de la aplicación cliente (`src/games/`).
- `server/src/AsteroidsRoom.ts` aún contenía el bloque condicional gigante con múltiples algoritmos de replicación de red de manera inline en el método `update()`.
- Por lo tanto, el entorno requería la intervención de las Misiones 1 y 2.

---

## 🚀 2. Progreso de la Migración

Se han ejecutado las siguientes tareas de manera exitosa:
1. **Movimiento Físico de Juegos:**
   - `src/games/flappybird` ➡️ `packages/core/src/games/flappybird`
   - `src/games/pong` ➡️ `packages/core/src/games/pong`
   - `src/games/space-invaders` ➡️ `packages/core/src/games/space-invaders`
2. **Exportación Pública en el Core:**
   - Modificado `packages/core/src/index.ts` para exportar las clases y tipos de los tres juegos migrados.
3. **Resolución de Referencias Circulares:**
   - Los juegos migrados importaban símbolos usando `@tiny-aster/core`. Dado que pertenecen al mismo paquete que se compila, esto provocaba que `tsup` intentara resolver el paquete contra una versión inexistente o antigua de `./dist/index.js`, fallando el build.
   - **Decisión Arquitectónica:** Se creó y ejecutó un script automatizado para reemplazar todas las importaciones de `"@tiny-aster/core"` dentro del subdirectorio `src/games/` de `packages/core` por rutas relativas seguras (`../../index` o `../../../index` dependiendo de la profundidad del archivo). Esto preserva la paridad y permite la compilación directa.

---

## 🧐 3. Dudas de Diseño & Dependencias de Presentación/App Identificadas

Durante los intentos de compilación del Core, se detectaron las siguientes dependencias no resueltas que rompen el principio de "Portabilidad Absoluta (Headless Server)":

### A. Dependencia de Capas de Colisión de la App (`CollisionLayers.ts`)
- **Problema:** Los juegos migrados intentan importar `CollisionLayers` desde `@/src/games/shared/types/CollisionLayers`.
- **Duda/Alternativa:** El core no debería conocer estas capas específicas. ¿Deberíamos mover `src/games/shared/` a `packages/core/src/games/shared/` para unificar el acceso?
- **Decisión Temporal:** Mover o replicar las definiciones de colisiones compartidas dentro del Core es la mejor forma de asegurar que el servidor headless pueda compilar e instanciar estos sistemas físicos sin requerir la presencia de la aplicación Expo.

### B. Dependencia de Servicios de Plataforma (`MutatorService` y `PlayerProfileService`)
- **Problema:** Los archivos de juego (por ejemplo, `FlappyBirdGame.ts` y `SpaceInvadersGame.ts`) importan `MutatorService` de la app de Expo para consultar mutadores activos durante `onRegisterSystems`.
- **Duda/Alternativa:** Los servicios que acceden a almacenamiento local de Expo no pueden ejecutarse de manera headless en el servidor.
- **Decisión Propuesta:** Abstraer o inyectar las configuraciones de mutadores en el constructor/config del juego, o usar un adapter noop en entornos headless para que las subclases no dependan directamente de un servicio de Expo.

### C. Dependencia de Generadores de Entidades Locales de la App (`EnemyFactory`, etc.)
- **Problema:** `SpaceInvadersGame` importa clases de factorías de enemigos de la carpeta de la app (`../../factories/EnemyFactory`).
- **Duda/Alternativa:** Estas factorías generan componentes de renderizado de plataforma.
- **Decisión Propuesta:** Migrar estas factorías al core o abstraer la creación de entidades de manera genérica.

---

## 🛠️ 4. Próximos Pasos en la Misión

Para culminar la Misión 1 y Misión 2 de forma robusta y limpia, se continuará con:
1. **Actualización de Imports en el Cliente:** Modificar las vistas y los hooks del cliente (`src/app/...` y `src/hooks/...`) para consumir los juegos desde `@tiny-aster/core`.
2. **Creación del Patrón Strategy para Replicación:** Diseñar e implementar las clases concretas de estrategia de replicación en el backend y refactorizar `AsteroidsRoom` para aplicar el Patrón Strategy.
3. **Saneamiento de Dependencias Externas en el Core:** Resolver la ubicación de `CollisionLayers` y desacoplar `MutatorService` de las subclases de juegos dentro de `packages/core`.

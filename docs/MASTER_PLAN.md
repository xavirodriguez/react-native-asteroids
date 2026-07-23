# Master Plan

### Fase 0 — Bugs críticos (prerequisito de todo lo demás)

Estos bugs hacen que el juego no funcione correctamente ahora mismo. Deben resolverse antes de cualquier refactorización porque si no, la refactorización mueve código roto.

| ID  | Archivo                                                                | Cambio                                                               |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| C   | `packages/core/src/ecs/WorldCommandBuffer.ts`                          | Añadir `w.cachedEntities = null` en `createEntity()`                 |
| A   | `packages/core/src/games/asteroids/systems/AsteroidCollisionSystem.ts` | Llamar `fragmentAsteroid()` antes de `removeEntity()`                |
| I   | `packages/core/src/network/ReplicationSystem.ts`                       | Ampliar `MultiplayerRegistry.Input` con todos los campos reales      |
| D   | `packages/core/src/network/`                                           | Split en `LocalPredictionSystem.ts` + `RemoteInterpolationSystem.ts` |
| B   | `packages/core/src/network/LocalPredictionSystem.ts`                   | Usar `computeShipPhysics` en `update()` y `reconcile()`              |
| E   | `packages/react-native/src/hooks/useMultiplayer.ts`                    | `persistentInputRef` con limpieza de discretas post-frame            |

**Criterio de salida:** El juego arranca, los asteroides se fragmentan, la predicción local no diverge del servidor.

---

### Fase 1 — Guardianes de calidad

Sin esto, cualquier cambio posterior puede introducir regresiones sin que nadie lo detecte.

**1.1 — CI básico** (`.github/workflows/ci.yml`)

```yaml
# En cada PR:
pnpm install --frozen-lockfile
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo test
pnpm turbo build
```

**1.2 — Completar el guardián de fronteras eslint**

El patrón actual solo captura `**/*Asteroid*` y `**/*Pong*`. Añadir:

````js
// eslint.config.mjs — dentro del bloque files: ["packages/core/src/**/*.ts"]
{ group: ["**/games/**"], message: "💥 FRONTERA ROTA: El Core es agnóstico." }
``` [3](#9-2)

**1.3 — Cerrar el `require()` en el core**

`AsteroidsGame.ts` usa `require("./config/asteroids.json")` dos veces. Eliminar el del constructor y convertir el de `onRegisterSystems()` a `import`. [4](#9-3)

**Criterio de salida:** Cualquier PR que rompa una frontera, introduzca un `any` nuevo en el core, o falle los tests es bloqueado automáticamente.

---

### Fase 2 — Separación arquitectónica

Este es el cambio más grande. El objetivo es que `packages/core` no exporte ningún juego.

**2.1 — Crear paquetes de juego en el workspace**

````

packages/
game-asteroids/ ← nuevo, package.json con dep: @tiny-aster/core
game-pong/ ← nuevo
game-flappybird/ ← nuevo
game-space-invaders/← nuevo

```

Cada paquete sigue el mismo patrón que `packages/renderer-canvas` o `packages/network-colyseus`: tiene su propio `package.json`, `tsconfig.json`, y declara `@tiny-aster/core` como dependencia.

**2.2 — Mover los directorios**

```

packages/core/src/games/asteroids/ → packages/game-asteroids/src/
packages/core/src/games/pong/ → packages/game-pong/src/
packages/core/src/games/flappybird/ → packages/game-flappybird/src/
packages/core/src/games/space-invaders/ → packages/game-space-invaders/src/

```

`packages/core/src/games/arcade/` y `packages/core/src/games/shared/` deben evaluarse: si son genéricos, se quedan en el core; si son específicos de un juego, se mueven.

**2.3 — Limpiar `packages/core/src/index.ts`**

Eliminar las líneas 96-114 (exports de juegos). El core solo exporta motor. [5](#9-4)

**2.4 — Actualizar `server/`**

Añadir `@tiny-aster/game-asteroids` como dependencia del servidor y actualizar los imports.

**Criterio de salida:** `pnpm lint` en `packages/core` pasa sin errores de `no-restricted-imports`. El core no exporta ningún juego.

---

### Fase 3 — Tipado del API pública del motor

Eliminar `any` de las interfaces que cientos de clases heredan. El orden importa: de más general a más específico.

| Archivo | `any` a eliminar | Tipo correcto |
|---|---|---|
| `runtime/BaseGame.ts` | `TInput extends Record<string, any>` | `Record<string, boolean \| number \| undefined>` |
| `runtime/IGame.ts` | `getGameState(): any` | `TState` (ya es genérico, solo falta propagarlo) |
| `network/NetworkTransport.ts` | Callbacks tipados como `any` | Tipos específicos de mensajes |
| `ecs/CoreComponents.ts` | `World<any, any, any>` en `ReclaimableComponent` | `World<ComponentRegistry, EventRegistry>` |
| `ecs/BlueprintRegistry.ts` | `BlueprintDefinition<any, any, infer TArgs>` | Genéricos correctos | [6](#9-5)

**Criterio de salida:** `@typescript-eslint/no-explicit-any: error` pasa en todos los archivos de `packages/core/src/runtime/`, `packages/core/src/network/`, y `packages/core/src/ecs/`.

---

### Fase 4 — Tipado del ECS interno

| Archivo | Cambio principal |
|---|---|
| `ecs/WorldCommandBuffer.ts` | Cast estrecho `as unknown as { ... }` en lugar de `as any` |
| `ecs/ComponentCloner.ts` | `Record<string, unknown>` en lugar de `{} as any` |
| `ecs/Query.ts` | `(globalThis as { __DEV__?: boolean }).__DEV__` |
| `ecs/World.ts` | Mismo patrón para `__DEV__` |
| `systems/MutatorSystem.ts` | `mutator.componentType as keyof TComponents` en lugar de `as any` | [7](#9-6) [8](#9-7)

**Criterio de salida:** `@typescript-eslint/no-explicit-any: error` pasa en `packages/core/src/ecs/` y `packages/core/src/systems/`.

---

### Fase 5 — Tipado de los juegos (uno por uno)

Orden recomendado por complejidad ascendente:

1. `packages/game-pong/` — el más simple
2. `packages/game-flappybird/`
3. `packages/game-space-invaders/`
4. `packages/game-asteroids/` — el más complejo (red, fragmentación, colisiones)

Para cada juego, el criterio de salida es:
- `0 any`
- `0 console.log`
- `0 unused imports/vars`
- `0 restricted imports` (no importa del core de otro juego)

Los fixes de la Fase 0 (bugs críticos de Asteroids) ya habrán resuelto los `any` más graves de ese juego.

---

### Fase 6 — Limpieza y calidad

Una vez que el código está tipado y la arquitectura es correcta, esta fase es mecánica:

- `@ts-ignore` → `@ts-expect-error` (principalmente en `SnapshotRestore.ts`)
- `require()` → `import` (principalmente en `FlappyBirdGame`)
- `console.log` → `ILogger` con implementaciones `ConsoleLogger` / `NullLogger`
- `eslint --fix` para imports y variables sin usar restantes

---

### Fase 7 — Tests y cobertura

El proyecto tiene solo 3 archivos de test para todo el motor. Las áreas críticas sin cobertura:

| Sistema | Test prioritario |
|---|---|
| `WorldCommandBuffer` | Verificar que `createEntity` invalida caché (bug C) |
| `AsteroidCollisionSystem` | Verificar que `fragmentAsteroid` se llama antes de `removeEntity` |
| `LocalPredictionSystem` | Verificar que `computeShipPhysics` produce el mismo resultado en cliente y servidor |
| `ReplicationSystem.reconcile()` | Verificar convergencia tras desincronización |




---

## Resumen visual

```

Fase 0 ──► Bugs críticos (juego roto)
│
▼
Fase 1 ──► CI + guardián eslint completo
│
▼
Fase 2 ──► Separar juegos del core (refactorización mayor)
│
▼
Fase 3 ──► Tipar API pública del motor
│
▼
Fase 4 ──► Tipar ECS interno
│
▼
Fase 5 ──► Tipar juegos (uno por uno)
│
▼
Fase 6 ──► Limpieza mecánica (eslint --fix, ts-ignore, require)
│
▼
Fase 7 ──► Tests de los sistemas críticos

````

La Fase 1 (CI) es el multiplicador de todo lo demás: sin ella, las fases 2-7 son trabajo que puede deshacerse en el siguiente commit.

### Citations

**File:** packages/core/package.json (L14-18)
```json
    "./games/asteroids": {
      "types": "./dist/games/asteroids/index.d.ts",
      "import": "./dist/games/asteroids/index.js",
      "require": "./dist/games/asteroids/index.cjs"
    }
````

**File:** server/package.json (L11-19)

```json
  "dependencies": {
    "@colyseus/core": "^0.17.0",
    "@colyseus/schema": "^4.0.19",
    "@colyseus/ws-transport": "^0.17.13",
    "better-sqlite3": "^12.9.0",
    "colyseus": "^0.17.0",
    "express": "^5.2.1",
    "msgpackr": "^1.11.12",
    "zod": "^4.4.3"
```

**File:** eslint.config.mjs (L120-148)

```javascript
      // EL GUARDIÁN DE FRONTERAS:
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-native",
                "expo*",
                "@shopify/react-native-skia",
              ],
              message:
                "💥 FRONTERA ROTA: El Core no puede depender de librerías de UI/Plataforma.",
            },
            {
              group: ["@colyseus/*", "colyseus"],
              message:
                "💥 FRONTERA ROTA: El Core no puede depender de implementaciones de red específicas. Usa NetworkTransport.",
            },
            {
              group: ["../../../src/games/*", "**/*Asteroid*", "**/*Pong*"],
              message:
                "💥 FRONTERA ROTA: El Core es agnóstico. No puede importar lógica específica de los juegos.",
            },
          ],
        },
      ],
    },
```

**File:** packages/core/src/games/asteroids/AsteroidsGame.ts (L75-77)

```typescript
    const rawConfig = require("./config/asteroids.json");
    this.config = rawConfig;
  }
```

**File:** packages/core/src/index.ts (L95-114)

```typescript
// Arcade Games Core
export * from "./games/arcade/index";

// Migrated Games
export { AsteroidsGame } from "./games/asteroids/AsteroidsGame";

export * from "./games/flappybird/FlappyBirdGame";
export * from "./games/flappybird/types/FlappyBirdTypes";
export * from "./games/flappybird/types/GameInterfaces";

export * from "./games/pong/PongGame";
export * from "./games/pong/types";
export * from "./games/pong/types/PongConfigSchema";

export * from "./games/space-invaders/SpaceInvadersGame";
export * from "./games/space-invaders/types/SpaceInvadersTypes";
export * from "./games/space-invaders/types/SpaceInvadersConfigSchema";
export * from "./games/space-invaders/types/GameInterfaces";

export * from "./games/shared/types/CollisionLayers";
```

**File:** packages/core/src/runtime/BaseGame.ts (L56-60)

```typescript
export abstract class BaseGame<
  TState = unknown,
  TInput extends Record<string, any> = Record<string, any>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
```

**File:** packages/core/src/systems/MutatorSystem.ts (L34-37)

```typescript
        const entities = world.query(mutator.componentType as any);
        for (const entity of entities) {
          world.mutateComponent(entity, mutator.componentType as any, (comp) => {
            mutator.mutate(comp, world);
```

**File:** packages/core/src/ecs/WorldCommandBuffer.ts (L99-109)

```typescript
  public createEntity(entity: number): void {
    this.commands.push({
      execute: (world) => {
        // Since the ID is already reserved, we just need to ensure it's marked as active.
        // If the ID was NOT reserved, this might cause issues if not careful.
        const w = world as unknown as { activeEntities: Set<number>, _structureVersion: number };
        w.activeEntities.add(entity);
        w._structureVersion++;
      }
    });
  }
```



### Objetivo real

No haría una extracción masiva nueva. Haría una **consolidación por cutover**:

```txt
src/engine        = motor legacy que debe adelgazar o desaparecer
packages/core    = nuevo core canónico
src/games/*      = lógica de juegos concretos
src/multiplayer  = candidato a adapter Colyseus
root Expo app    = consumidor real inicial
```

En este repo no existe todavía `apps/asteroids`; la app Expo vive en la raíz con `src/app`, `src/games`, `src/components`, `expo-router`, etc. Por eso, antes de mover la app a `apps/asteroids`, usaría la **app raíz** como consumidor real de `@tiny-aster/core`. La migración a `apps/asteroids` puede ser una fase posterior.

---

## Fase 1 — Convertir el repo en workspace real

**Estado actual:** el root `package.json` es la app Expo privada `asteroides`, con `main: "expo-router/entry"`, dependencias de Expo, React Native, Skia y Colyseus, pero `@tiny-aster/core` vive como paquete local separado. ([GitHub][8])

**Cambio concreto:**

Añadir workspaces al root sin cambiar todavía a pnpm si no quieres tocar demasiado:

```json
{
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

Añadir scripts:

```json
{
  "scripts": {
    "build:core": "npm --workspace @tiny-aster/core run build",
    "typecheck:core": "npm --workspace @tiny-aster/core run typecheck",
    "typecheck:app": "tsc -p tsconfig.json --noEmit",
    "test:ci": "jest --runInBand"
  }
}
```

En `packages/core/package.json`, ahora mismo hay `main`, `module`, `types` y `exports`, pero no hay script de build visible. ([GitHub][1]) Como el package declara simultáneamente ESM y CJS:

```json
"main": "./dist/index.cjs",
"module": "./dist/index.js"
```

necesitas **tsup** o una doble compilación. Recomendación:

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --sourcemap --clean",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Definition of done:**

```bash
npm run build:core
node -e "import('@tiny-aster/core').then(m => console.log(Object.keys(m)))"
```

---

## Fase 2 — Declarar `packages/core` como API canónica

**Corrección a mi respuesta anterior:** no hay que “crear `packages/core`”; hay que convertirlo en **única fuente de verdad**.

El nuevo `packages/core` ya tiene una arquitectura genérica: `World` es genérico sobre registros de componentes, eventos y blueprints, y `Component.ts` ya define `ComponentRegistry`, `ComponentType`, `ComponentOf` y `DeepReadonly`. ([GitHub][9]) ([GitHub][10])

El siguiente paso no es reescribir ese diseño, sino **portar funcionalidades maduras desde `src/engine` a `packages/core` sin arrastrar dominio de Asteroids**.

Prioridad de port:

```txt
1. GameLoop
2. snapshots / restore / deltaSnapshot
3. RandomService
4. physics genérico
5. collision genérico
6. renderer contracts
7. NetworkTransport
```

No portaría todavía:

```txt
UnifiedInputSystem
SceneManager
AudioSystem concreto
FeedbackSystem
ColyseusConnection
React hooks
Skia/Canvas renderer concreto
Asteroids components
Invaders components
Pong/Ball components
```

---

## Fase 3 — Mover `GameLoop`, pero corrigiendo dependencia de browser

**Problema real:** el `GameLoop` legacy usa directamente `performance.now()` y `requestAnimationFrame`. ([GitHub][11]) Eso lo hace válido para browser/React Native Web, pero no para core puro, tests headless o servidor.

**Cambio preciso:**

Mover `src/engine/core/GameLoop.ts` a:

```txt
packages/core/src/loop/GameLoop.ts
```

pero antes introducir:

```ts
export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): unknown;
  cancelFrame(handle: unknown): void;
}
```

Implementación default:

```ts
export const browserFrameScheduler: FrameScheduler = {
  now: () => globalThis.performance?.now?.() ?? Date.now(),
  requestFrame: callback => globalThis.requestAnimationFrame(callback),
  cancelFrame: handle => globalThis.cancelAnimationFrame(handle as number)
};
```

Constructor:

```ts
export interface GameLoopConfig {
  maxDeltaMs?: number;
  maxUpdatesPerFrame?: number;
  scheduler?: FrameScheduler;
}
```

**También corregir `packages/core/tsconfig.json`:** ahora incluye `"lib": ["ESNext", "DOM"]`. ([GitHub][12]) Si el core debe ser runtime-agnóstico, lo ideal es quitar `DOM` del core y mover los tipos de browser a un adapter. Alternativa menos agresiva: mantener `DOM` temporalmente pero aislarlo en `scheduler/browserFrameScheduler.ts`.

**Definition of done:**

```txt
GameLoop compila en packages/core.
GameLoop puede testearse con un FakeScheduler.
No hay uso directo de requestAnimationFrame en la clase principal.
```

---

## Fase 4 — Portar snapshots desde `src/engine/core/World.ts`

**Problema real:** el `World` legacy tiene mucha funcionalidad avanzada que el `World` nuevo de `packages/core` aún no tiene: versiones de estado, snapshots, restore, delta snapshots, command buffer, random streams, estructura determinista y control de mutaciones durante update. ([GitHub][13])

**Cambio preciso:**

No reemplazaría de golpe el `World` nuevo. Haría esto:

```txt
packages/core/src/ecs/World.ts
  conservar diseño genérico actual

packages/core/src/snapshots/
  WorldSnapshot.ts
  SnapshotSerializer.ts
  SnapshotRestore.ts
```

Y portaría de `src/engine/core/World.ts`:

```txt
WorldSnapshot
ComponentDataSnapshot
SerializedComponent
snapshot()
restore()
deltaSnapshot()
structureVersion
stateVersion
componentVersions
tick
advanceTick()
```

**Importante:** en el legacy `World.ts` hay contaminación directa:

```ts
import { AnyCoreComponent, ComponentOf } from "./CoreComponents";
import { EntityBlueprintAssembler } from "../../factories/EntityBlueprintAssembler";
import { BlueprintOverrides } from "../../data/blueprints/types/BlueprintTypes";
```

Eso no puede entrar en `packages/core`. ([GitHub][13]) El `packages/core` ya tiene una mejor dirección: `WorldCommandBuffer` usa `BlueprintRegistry` genérico como recurso, en lugar de depender de `EntityBlueprintAssembler` de Asteroids. ([GitHub][14])

**Definition of done:**

```txt
packages/core World soporta snapshot/restore sin importar src/data, src/factories ni AnyCoreComponent.
Los snapshots usan ComponentRegistry genérico.
El API legacy spawnFromBlueprint desaparece del World core y queda solo en WorldCommandBuffer/BlueprintRegistry.
```

---

## Fase 5 — Mover física y colisiones reales, no solo `CollisionHelpers`

**Estado actual:** `packages/core/src/physics/CollisionHelpers.ts` solo tiene helpers de bitmask (`layer`, `maskOf`). ([GitHub][15]) El motor real todavía vive en `src/engine/physics` y el entrypoint legacy exporta `PhysicsUtils`, `PhysicsIntegrateSystem`, `PhysicsSolveSystem`, `CollisionSystem2D`, `PhysicsQuery`, shapes, `MovementSystem`, `FrictionSystem` y `BoundarySystem`. ([GitHub][2])

**Cambio preciso:**

Mover a `packages/core/src/physics`:

```txt
physics/shapes/*
physics/collision/CollisionTypes.ts
physics/collision/CollisionSystem2D.ts
physics/query/*
physics/utils/PhysicsUtils.ts
physics/systems/MovementSystem.ts
physics/systems/FrictionSystem.ts
physics/systems/BoundarySystem.ts
physics/dynamics/PhysicsIntegrateSystem.ts
physics/dynamics/PhysicsSolveSystem.ts
```

**Pero con una regla:** nada de `CollisionLayers.PLAYER`, `ENEMY`, `PROJECTILE`, etc. En `packages/core` solo dejar:

```ts
export type CollisionLayer = number;
export type CollisionMask = number;

export function layer(bit: number): number {
  return 1 << bit;
}

export function maskOf(...layers: number[]): number {
  return layers.reduce((acc, value) => acc | value, 0);
}
```

Eso ya está alineado con el `CollisionHelpers` actual. ([GitHub][15])

**Definition of done:**

```bash
grep -R "PLAYER\\|ENEMY\\|PROJECTILE\\|Asteroid\\|Ship\\|Invader" packages/core/src/physics && exit 1
```

---

## Fase 6 — Render: contratos en core, implementaciones fuera

**Estado actual:** el renderer legacy ya está planteado como interfaz abstracta `Renderer<TContext>`, `ShapeDrawer` y `EffectDrawer`, y toma `World` como entrada de render. ([GitHub][16]) Eso sí pertenece al core **como contrato**, no como implementación.

**Cambio preciso:**

Mover a:

```txt
packages/core/src/rendering/
  Renderer.ts
  RenderTypes.ts
  RenderSnapshot.ts
  RenderCommandBuffer.ts
```

No mover todavía a core:

```txt
Canvas renderer concreto
Skia renderer concreto
React Native components
hooks de React
expo haptics
```

Crear paquetes opcionales:

```txt
packages/renderer-canvas
packages/renderer-skia
packages/react-native
```

Para este repo, el primer adapter útil sería probablemente:

```txt
packages/react-native
```

porque la app raíz ya depende de Expo, React Native y Skia. ([GitHub][8])

**Definition of done:**

```txt
@tiny-aster/core exporta Renderer, RenderCommand, RenderSnapshot, ShapeDrawer.
@tiny-aster/core no importa @shopify/react-native-skia, react-native, expo ni react.
La app puede registrar drawers desde el paquete React Native/Skia.
```

---

## Fase 7 — Network: `NetworkTransport` al core, Colyseus a adapter

**Estado actual:** ya existe una interfaz `NetworkTransport` en `src/engine/network/NetworkTransport.ts`, y es suficientemente genérica para moverse a core. ([GitHub][17]) El cliente Colyseus real está en `src/multiplayer/ColyseusConnection.ts` y depende de `@colyseus/sdk`. ([GitHub][18]) El hook `useMultiplayer` también depende de React y Colyseus. ([GitHub][19])

**Cambio preciso:**

Mover solo esto a core:

```txt
src/engine/network/NetworkTransport.ts
→ packages/core/src/network/NetworkTransport.ts
```

Crear:

```txt
packages/network-colyseus/
  src/ColyseusTransport.ts
  src/index.ts
  package.json
```

`ColyseusTransport` debería implementar:

```ts
import type { NetworkTransport } from '@tiny-aster/core';
import { Client, Room } from '@colyseus/sdk';

export class ColyseusTransport implements NetworkTransport {
  // adapta send/onMessage/connect/disconnect/getSessionId
}
```

El server Colyseus ya vive separado en `server/` y tiene sus propias dependencias `colyseus`, `@colyseus/core`, `@colyseus/schema`, etc., así que no lo mezclaría con `packages/core`. ([GitHub][20])

**Definition of done:**

```bash
grep -R "colyseus\\|@colyseus" packages/core/src && exit 1
```

---

## Fase 8 — Resolver la duplicación `src/engine` vs `packages/core`

Este es el punto más importante.

**Hoy hay dos motores:**

```txt
src/engine         motor completo legacy
packages/core     nuevo core parcial
```

El `tsconfig.doc.json` sigue generando declaraciones desde `src/engine/**/*.ts`, y API Extractor consume `/temp/declarations/engine/index.d.ts`, lo que explica que el `.d.ts` publicado siga reflejando el motor contaminado. ([GitHub][6]) ([GitHub][7])

**Cambio preciso:**

Durante una transición corta, convertir `src/engine/index.ts` en compat layer:

```ts
export * from '@tiny-aster/core';

// Temporalmente, solo mientras migras:
export * from './legacy';
```

Pero el objetivo final debe ser:

```txt
src/engine/index.ts desaparece
o
src/engine/index.ts solo reexporta paquetes
```

Actualizar documentación:

```json
{
  "include": ["packages/core/src/**/*.ts"]
}
```

Actualizar `api-extractor.json` para apuntar a:

```txt
packages/core/dist/index.d.ts
```

o generar declaraciones desde `packages/core/src/index.ts`.

**Definition of done:**

```txt
El d.ts generado de core ya no contiene AsteroidComponent, ShipComponent, InvaderComponent, BallComponent ni EnemyTagComponent.
docs:extract ya no depende de src/engine.
```

---

## Fase 9 — Sacar componentes de juego del motor legacy

Esta fase aplica a `src/engine/core/CoreComponents.ts`, no tanto a `packages/core`, que ya está bastante más limpio.

Mover desde `src/engine/core/CoreComponents.ts` hacia juego/app:

```txt
AsteroidComponent
InvaderComponent
BulletComponent
ShipComponent
EnemyTagComponent
Star
BallComponent
PowerUpComponent
LootTableComponent
ModifierStackComponent
```

Destino recomendado:

```txt
src/games/asteroids/components/
  AsteroidComponent.ts
  ShipComponent.ts
  BulletComponent.ts
  EnemyTagComponent.ts
  AsteroidsComponentRegistry.ts

src/games/pong/components/
  BallComponent.ts

src/games/arcade/components/
  PowerUpComponent.ts
  LootTableComponent.ts
  ModifierStackComponent.ts
```

O, si no quieres crear tantos dominios aún:

```txt
src/games/asteroids/domain/components.ts
src/games/arcade/domain/components.ts
```

El `AnyCoreComponent` legacy debe desaparecer. En el paquete nuevo ya existe el patrón correcto: registros genéricos de componentes. ([GitHub][10])

Ejemplo para Asteroids:

```ts
import type {
  CoreComponentRegistry,
  Component
} from '@tiny-aster/core';

export interface AsteroidComponent extends Component {
  type: 'Asteroid';
  size: 'large' | 'medium' | 'small';
  splitsInto?: readonly string[];
  splitCount?: number;
}

export interface ShipComponent extends Component {
  type: 'Ship';
  sessionId?: string;
  score: number;
  hyperspaceTimer: number;
  hyperspaceCooldownRemaining: number;
}

export interface AsteroidsComponentRegistry extends CoreComponentRegistry {
  Asteroid: AsteroidComponent;
  Ship: ShipComponent;
}
```

**Definition of done:**

```bash
grep -R "AsteroidComponent\\|ShipComponent\\|InvaderComponent\\|EnemyTagComponent\\|BallComponent" src/engine packages/core/src && exit 1
```

---

## Fase 10 — Migrar imports de la app raíz

En vez de crear `apps/asteroids` inmediatamente, migraría primero la app existente.

Buscar imports actuales tipo:

```ts
from '@/src/engine'
from '../engine'
from '../../engine/core/World'
```

y reemplazar por:

```ts
from '@tiny-aster/core'
```

Para lo que aún no esté en core, usar paquetes o rutas de juego:

```ts
from '@/src/games/asteroids/components'
from '@/src/multiplayer'
from '@tiny-aster/network-colyseus'
from '@tiny-aster/react-native'
```

**Orden de migración recomendado:**

```txt
1. Tests y simulación pura → @tiny-aster/core
2. Sistemas de física → @tiny-aster/core
3. Rendering contracts → @tiny-aster/core
4. UI/React/hooks → se quedan fuera
5. Multiplayer → adapter Colyseus
6. Componentes Asteroids → src/games/asteroids
```

**Definition of done:**

```bash
grep -R "from .*src/engine" src --include="*.ts" --include="*.tsx" && exit 1
```

---

## Fase 11 — CI de fronteras arquitectónicas

El root ya tiene un script `check:ecs-invariants`. ([GitHub][8]) Lo extendería con checks de boundaries.

Crear:

```txt
scripts/check-core-boundaries.sh
```

Contenido:

```bash
#!/usr/bin/env bash
set -euo pipefail

forbidden_core_patterns=(
  "Asteroid"
  "Ship"
  "Invader"
  "Ball"
  "EnemyTag"
  "BlueprintKind"
  "ship:"
  "asteroid:"
  "si:"
  "@colyseus"
  "colyseus"
  "react-native"
  "@shopify/react-native-skia"
  "expo-"
)

for pattern in "${forbidden_core_patterns[@]}"; do
  if grep -R "$pattern" packages/core/src --include="*.ts" --include="*.tsx"; then
    echo "Forbidden pattern in packages/core/src: $pattern"
    exit 1
  fi
done
```

Añadir:

```json
{
  "scripts": {
    "check:core-boundaries": "bash ./scripts/check-core-boundaries.sh",
    "ci": "npm run typecheck:core && npm run build:core && npm run check:core-boundaries && npm run lint && npm run test:ci"
  }
}
```

---

## Roadmap de PRs ajustado al repo real

### PR 1 — Workspace + build real de `@tiny-aster/core`

**Toca:**

```txt
package.json
packages/core/package.json
packages/core/tsconfig.json
```

**Entrega:**

```txt
npm run build:core funciona.
@tiny-aster/core genera dist.
No se mueve lógica todavía.
```

---

### PR 2 — Portar loop + snapshots + RandomService

**Toca:**

```txt
packages/core/src/loop/GameLoop.ts
packages/core/src/snapshots/*
packages/core/src/random/RandomService.ts
packages/core/src/index.ts
```

**Entrega:**

```txt
GameLoop usa FrameScheduler.
World soporta snapshot/restore o helpers equivalentes.
No hay requestAnimationFrame directo en el core principal.
```

---

### PR 3 — Portar physics/collision genérico

**Toca:**

```txt
packages/core/src/physics/*
packages/core/src/math/*
packages/core/src/index.ts
```

**Entrega:**

```txt
PhysicsUtils, CollisionSystem2D, ShapeFactory, PhysicsQuery y sistemas básicos exportados desde @tiny-aster/core.
CollisionLayers hardcodeado desaparece o se reemplaza por layer()/maskOf().
```

---

### PR 4 — Render contracts

**Toca:**

```txt
packages/core/src/rendering/*
packages/core/src/index.ts
```

**Entrega:**

```txt
Renderer, ShapeDrawer, EffectDrawer, RenderSnapshot, RenderCommand y RenderCommandBuffer salen de @tiny-aster/core.
Implementaciones Canvas/Skia siguen fuera.
```

---

### PR 5 — Network contract + adapter Colyseus

**Toca:**

```txt
packages/core/src/network/NetworkTransport.ts
packages/network-colyseus/*
src/multiplayer/ColyseusConnection.ts
```

**Entrega:**

```txt
@tiny-aster/core exporta NetworkTransport.
@tiny-aster/network-colyseus implementa ColyseusTransport.
src/multiplayer puede usar el adapter o quedarse como wrapper React/app.
```

---

### PR 6 — Sacar componentes Asteroids del motor legacy

**Toca:**

```txt
src/engine/core/CoreComponents.ts
src/games/asteroids/*
src/data/blueprints/*
src/factories/*
```

**Entrega:**

```txt
AsteroidComponent, ShipComponent, BulletComponent, InvaderComponent, EnemyTagComponent y BlueprintKind salen de src/engine.
La app define AsteroidsComponentRegistry.
```

---

### PR 7 — Cutover de imports de la app

**Toca:**

```txt
src/**/*.ts
src/**/*.tsx
```

**Entrega:**

```txt
La app importa ECS/física/render contracts desde @tiny-aster/core.
La app importa componentes de juego desde src/games/asteroids.
No quedan imports funcionales desde src/engine salvo compat temporal.
```

---

### PR 8 — Docs/API Extractor apuntan al paquete nuevo

**Toca:**

```txt
tsconfig.doc.json
api-extractor.json
docs/*
```

**Entrega:**

```txt
El d.ts generado sale de packages/core.
El d.ts generado no contiene componentes de Asteroids.
Roadmap.md se actualiza para reflejar que packages/core ya existe.
```

---

## Cambios a mi respuesta anterior

Lo que cambiaría explícitamente:

```txt
Antes: “Crear packages/core”.
Ahora: “packages/core ya existe; hay que hacerlo canónico y consumido por la app”.
```

```txt
Antes: “Extraer AnyCoreComponent”.
Ahora: “AnyCoreComponent sigue en src/engine legacy; packages/core ya va por registro genérico. El trabajo es eliminar o aislar src/engine/CoreComponents.ts”.
```

```txt
Antes: “Mantener apps/asteroids como consumidor”.
Ahora: “Primero usar la app Expo raíz como consumidor real; mover a apps/asteroids después si se quiere formalizar monorepo”.
```

```txt
Antes: “Mover Colyseus a adapter”.
Ahora: “Mover NetworkTransport a packages/core y convertir src/multiplayer/ColyseusConnection.ts en packages/network-colyseus; el server/ puede seguir separado”.
```

```txt
Antes: “Mover renderers opcionales”.
Ahora: “Mover primero contratos de src/engine/rendering a packages/core; después crear @tiny-aster/react-native/@tiny-aster/renderer-skia”.
```

## Definition of Done final

La extracción estará realmente terminada cuando:

```txt
npm run build:core genera dist de @tiny-aster/core.
La app raíz compila importando World/System/Query/physics/render contracts desde @tiny-aster/core.
docs:extract ya no apunta a src/engine.
El d.ts público no contiene AsteroidComponent, ShipComponent, InvaderComponent, BallComponent ni EnemyTagComponent.
packages/core no contiene imports de react-native, expo, Skia, Colyseus, src/data, src/factories ni src/games.
Colyseus vive en un adapter opcional.
src/engine queda eliminado o convertido en compat layer temporal.
```

La conclusión precisa: **el core nuevo va por buen camino, pero todavía no es la fuente de verdad del proyecto**. El roadmap debe enfocarse menos en “extraer desde cero” y más en **portar las capacidades maduras de `src/engine`, cortar dependencias de juego, y forzar que la app consuma `@tiny-aster/core` de verdad**.

[1]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/package.json "raw.githubusercontent.com"
[2]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/engine/index.ts "raw.githubusercontent.com"
[3]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/src/index.ts "raw.githubusercontent.com"
[4]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/engine/core/CoreComponents.ts "raw.githubusercontent.com"
[5]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/Auditoria_Refactorizacion_Core.md "raw.githubusercontent.com"
[6]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/tsconfig.doc.json "raw.githubusercontent.com"
[7]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/api-extractor.json "raw.githubusercontent.com"
[8]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/package.json "raw.githubusercontent.com"
[9]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/src/ecs/World.ts "raw.githubusercontent.com"
[10]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/src/ecs/Component.ts "raw.githubusercontent.com"
[11]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/engine/core/GameLoop.ts "raw.githubusercontent.com"
[12]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/tsconfig.json "raw.githubusercontent.com"
[13]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/engine/core/World.ts "raw.githubusercontent.com"
[14]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/src/ecs/WorldCommandBuffer.ts "raw.githubusercontent.com"
[15]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/packages/core/src/physics/CollisionHelpers.ts "raw.githubusercontent.com"
[16]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/engine/rendering/Renderer.ts "raw.githubusercontent.com"
[17]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/engine/network/NetworkTransport.ts "raw.githubusercontent.com"
[18]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/multiplayer/ColyseusConnection.ts "raw.githubusercontent.com"
[19]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/src/multiplayer/useMultiplayer.ts "raw.githubusercontent.com"
[20]: https://raw.githubusercontent.com/xavirodriguez/react-native-asteroids/master/server/package.json "raw.githubusercontent.com"


Actúa como Staff Engineer experto en TypeScript, motores ECS, arquitectura de paquetes npm y refactorizaciones incrementales. Debes implementar la Fase 0A de desacoplamiento del motor `react-native-asteroids` para convertir su núcleo en una base reutilizable publicable como paquete npm `@tiny-aster/core`.

Objetivo principal:
Separar el core del motor de cualquier conocimiento específico de juegos como Asteroids, Pong, Invaders o React Native, sin romper la app existente. La implementación debe ser incremental, testeable y compatible con la arquitectura actual.

No publiques nada en npm. No hagas cambios cosméticos innecesarios. No hagas una reescritura total. Refactoriza con compatibilidad hacia atrás cuando sea razonable.

## Contexto técnico actual

El repo actual es una app Expo/React Native, no un paquete npm core limpio. El `package.json` raíz usa `main: "expo-router/entry"`, contiene dependencias de Expo, React Native, Skia, Colyseus y está marcado como `private: true`.

El `World` actual depende de:
- `AnyCoreComponent`
- `ComponentOf`
- `EntityBlueprintAssembler`
- `BlueprintOverrides`
- tipos de blueprints específicos de juego

La API declarada actual incluye componentes y tipos de juego dentro del supuesto core:
- `AsteroidComponent`
- `ShipComponent`
- `InvaderComponent`
- `BulletComponent`
- `BallComponent`
- `EnemyTagComponent`
- `CommandType_2 = 'THRUST' | 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'FIRE' | 'HYPERSPACE'`
- `CollisionLayers.PLAYER`, `ENEMY`, `PROJECTILE`, etc.
- `HapticRequestComponent.pattern = "shoot" | "damage" | "death" | "hyperspace" | "thrust"`

El roadmap que debes implementar incluye cuatro problemas:
1. Eliminar el infierno de tipos `AnyCoreComponent` y `ComponentOf`.
2. Desacoplar el sistema de blueprints/prefabs hardcodeado.
3. Abstraer `AssetLoader` y `AudioSystem` mediante interfaces de I/O.
4. Mantener seguridad de tipos en `EventBus` mediante un registro genérico de eventos.

## Reglas de implementación

### Regla 1: no romper comportamiento existente

Antes de tocar código:
1. Inspecciona el árbol del repo.
2. Localiza todos los usos de:
   - `AnyCoreComponent`
   - `ComponentOf`
   - `spawnFromBlueprint`
   - `BlueprintKind`
   - `AsteroidBlueprint`
   - `InvaderBlueprint`
   - `UFOBlueprint`
   - `ProjectileBlueprint`
   - `CollisionLayers`
   - `CommandType_2`
   - `HapticRequestComponent`
   - `AssetLoader`
   - `AudioSystem`
   - `EventBus`
3. Crea una lista de archivos afectados.
4. Ejecuta los tests o, como mínimo:
   - `npm run lint`
   - `npm test`
   - `npm run docs:extract` si existe y es viable
   - `npx tsc -p tsconfig.json --noEmit` o el comando equivalente disponible

Si algún comando falla antes de modificar, documenta el fallo como baseline y continúa con cambios acotados.

### Regla 2: core agnóstico

El core no puede conocer:
- Asteroids
- Pong
- Space Invaders
- UFOs
- player/enemy/projectile semánticos
- Colyseus como implementación concreta
- Expo
- React Native
- Skia
- AudioContext directo
- rutas de assets nativas
- servicios de perfil, XP, paletas o metajuego

El core sí puede conocer:
- ECS
- Entity
- Component
- System
- Query
- World
- WorldCommandBuffer
- GameLoop
- RandomService
- snapshots serializables
- render interfaces abstractas
- physics/math genérica
- input abstracto
- event bus abstracto
- asset/audio interfaces abstractas

## Tarea A: crear el modelo genérico de componentes

Implementa un Type Registry Map.

### Archivos esperados

Crea o ajusta:

```ts
packages/core/src/ecs/Component.ts
packages/core/src/ecs/World.ts
packages/core/src/ecs/Query.ts
packages/core/src/ecs/WorldCommandBuffer.ts
packages/core/src/ecs/System.ts
````

Si todavía no existe `packages/core`, puedes implementar primero en `src/engine/core` manteniendo nombres compatibles, pero deja el código preparado para moverlo a `packages/core`.

### Tipos obligatorios

```ts
export interface Component {
  type: string;
}

export type ComponentRegistry = Record<string, Component>;

export type ComponentType<TRegistry extends ComponentRegistry> =
  Extract<keyof TRegistry, string>;

export type ComponentOf<
  TRegistry extends ComponentRegistry,
  TType extends ComponentType<TRegistry>
> = TRegistry[TType];

export type DeepReadonly<T> =
  T extends (...args: any[]) => any
    ? T
    : T extends readonly any[]
      ? ReadonlyArray<DeepReadonly<T[number]>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;
```

### World genérico

Refactoriza `World` así:

```ts
export class World<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  getComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K
  ): DeepReadonly<TComponents[K]> | undefined;

  getMutableComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K
  ): TComponents[K] | undefined;

  addComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    component: TComponents[K]
  ): void;

  removeComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K
  ): void;

  mutateComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K,
    updater: (component: TComponents[K]) => void
  ): boolean;

  query(...componentTypes: ComponentType<TComponents>[]): ReadonlyArray<Entity>;

  getEntitiesWith(...componentTypes: ComponentType<TComponents>[]): ReadonlyArray<Entity>;
}
```

Mantén overloads compatibles para `string` si son necesarios durante la migración, pero marca los overloads antiguos como `@deprecated`.

### Requisito crítico

Elimina dependencias internas de `World` hacia:

* `AnyCoreComponent`
* `ComponentOf` antiguo basado en `AnyCoreComponent`
* blueprints específicos del juego
* factories de app

Si no puedes eliminarlas todas en un solo paso sin romper, encapsúlalas en una capa `legacy` y documenta un TODO claro.

## Tarea B: separar componentes core de componentes de juego

Crea un registro explícito de componentes core.

Ejemplo:

```ts
export interface CoreComponentRegistry {
  Transform: TransformComponent;
  PreviousTransform: PreviousTransformComponent;
  Velocity: VelocityComponent;
  Friction: FrictionComponent;
  Boundary: BoundaryComponent;
  TTL: TTLComponent;
  Collider2D: Collider2DComponent;
  CollisionEvents: CollisionEventsComponent;
  PhysicsBody2D: PhysicsBody2DComponent;
  Render: RenderComponent;
  Health: HealthComponent;
  InputState: InputStateComponent;
  EventBus: EventBusComponent<any>;
  Animator: AnimatorComponent;
  StateMachine: StateMachineComponent;
  ParticleEmitter: ParticleEmitterComponent;
  Tilemap: TilemapComponent;
  Camera2D: Camera2DComponent;
  ScreenShake: ScreenShakeComponent;
  VisualOffset: VisualOffsetComponent;
  Trail: TrailComponent;
  SpatialNode: SpatialNodeComponent;
  HapticRequest: HapticRequestComponent<string>;
}
```

Mueve o clasifica fuera del core:

* `AsteroidComponent`
* `InvaderComponent`
* `BulletComponent`
* `ShipComponent`
* `BallComponent`
* `EnemyTagComponent`
* cualquier blueprint concreto de juego

El consumidor debe poder definir:

```ts
export interface AsteroidComponent extends Component {
  type: "Asteroid";
  size: "large" | "medium" | "small";
}

export interface ShipComponent extends Component {
  type: "Ship";
  score: number;
}

export type AsteroidsComponentRegistry =
  CoreComponentRegistry & {
    Asteroid: AsteroidComponent;
    Ship: ShipComponent;
  };
```

## Tarea C: EventBus genérico y compatible con deferred events

Implementa `EventBus<TEvents>` sin perder funcionalidades actuales.

### Tipos

```ts
export type EventRegistry = Record<string, unknown>;

export interface CoreEvents {
  "engine:paused": { tick: number; timestamp: number };
  "engine:resumed": { tick: number; timestamp: number };
  "engine:destroyed": { timestamp: number };
}

export type CombinedEvents<TEvents extends EventRegistry> =
  CoreEvents & TEvents;

export type EventHandler<TPayload> =
  (payload: TPayload, event: string) => void;
```

### API obligatoria

```ts
export class EventBus<TEvents extends EventRegistry = EventRegistry> {
  on<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void;

  once<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void;

  off<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): void;

  emit<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void;

  emitDeferred<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void;

  flushDeferred(): void;

  clear(pattern?: string): void;
}
```

### Requisitos de comportamiento

Conserva:

* cola deferred
* protección contra reentrancia
* `MAX_RECURSION` o equivalente
* clonación de listeners antes de iterar
* posibilidad de limpiar por patrón

El core puede usar `EventBus<any>` internamente si un sistema genérico necesita emitir eventos dinámicos. El consumidor debe poder usar:

```ts
type AsteroidsEvents = {
  "ship:damaged": { shipEntity: Entity; damageAmount: number };
  "asteroid:split": { parentEntity: Entity; size: "large" | "medium" | "small" };
};

const bus = new EventBus<AsteroidsEvents>();

bus.emit("ship:damaged", {
  shipEntity: 1,
  damageAmount: 10
});
```

Añade tests de tipos con `// @ts-expect-error` para payloads incorrectos.

## Tarea D: BlueprintRegistry tipado y sin hardcode de juego

No implementes el `BlueprintRegistry` como `string + any` si puedes evitarlo. Usa un registro genérico de IDs y argumentos.

### Tipos requeridos

```ts
export type BlueprintRegistryMap<TComponents extends ComponentRegistry> =
  Record<string, BlueprintDefinition<TComponents, any>>;

export interface BlueprintDefinition<
  TComponents extends ComponentRegistry,
  TArgs
> {
  spawn(world: World<TComponents, any, any>, entity: Entity, args: TArgs): void;
}

export type BlueprintArgs<TBlueprints, TId extends keyof TBlueprints> =
  TBlueprints[TId] extends BlueprintDefinition<any, infer TArgs>
    ? TArgs
    : never;
```

### Clase requerida

```ts
export class BlueprintRegistry<
  TComponents extends ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  register<TId extends keyof TBlueprints & string>(
    id: TId,
    blueprint: TBlueprints[TId]
  ): void;

  get<TId extends keyof TBlueprints & string>(
    id: TId
  ): TBlueprints[TId] | undefined;

  has<TId extends keyof TBlueprints & string>(id: TId): boolean;

  clear(): void;
}
```

### WorldCommandBuffer

Refactoriza `WorldCommandBuffer` para aceptar el registro:

```ts
spawnFromBlueprint<TId extends keyof TBlueprints & string>(
  blueprintId: TId,
  args: BlueprintArgs<TBlueprints, TId>
): void;
```

Durante `flush`, debe:

1. buscar el blueprint,
2. crear entity,
3. llamar `blueprint.spawn(world, entity, args)`.

El core no debe importar:

* `AsteroidBlueprint`
* `InvaderBlueprint`
* `UFOBlueprint`
* `ProjectileBlueprint`
* `BlueprintKind`
* `EntityBlueprintAssembler`

Si la app actual depende de `EntityBlueprintAssembler`, muévelo a `apps/asteroids` o a un paquete/preset específico, no al core.

## Tarea E: constantes hardcodeadas

### CollisionLayers

El core puede exportar solo helpers genéricos:

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

Mueve significados como `PLAYER`, `ENEMY`, `PROJECTILE`, `PICKUP` al juego consumidor.

### Commands

Reemplaza:

```ts
type CommandType_2 = 'THRUST' | 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'FIRE' | 'HYPERSPACE';
```

por:

```ts
export interface GameCommand<TType extends string = string, TPayload = Record<string, unknown>> {
  type: TType;
  entityId: Entity;
  tick: number;
  payload?: TPayload;
}
```

`CommandQueueComponent` debe aceptar genéricos o usar `GameCommand<string, unknown>` en core.

### Haptics

Reemplaza patrones hardcodeados:

```ts
pattern: "shoot" | "damage" | "death" | "hyperspace" | "thrust";
```

por:

```ts
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
}
```

El driver de React Native decide cómo mapear `"shoot"` o `"damage"`.

## Tarea F: AssetLoader y AudioSystem mediante drivers

El core no debe depender de DOM, Expo, React Native ni AudioContext directamente.

### Interfaces core

Crea:

```ts
export type AssetType = "texture" | "audio" | "json" | "font";

export interface AssetDescriptor {
  id: string;
  type: AssetType;
  uri?: string;
  module?: unknown;
  preload?: boolean;
}

export type AssetStatus = "loading" | "ready" | "error";

export interface AssetHandle<T = unknown> {
  id: string;
  status: AssetStatus;
  data: T | null;
  error?: Error;
}

export interface IAssetProvider {
  load<T = unknown>(asset: AssetDescriptor): Promise<T>;
  dispose?(asset: AssetHandle<unknown>): void | Promise<void>;
}

export interface IAudioPlayer {
  loadSFX(name: string, source: AssetDescriptor | string): Promise<void>;
  loadMusic(name: string, source: AssetDescriptor | string): Promise<void>;
  playSFX(name: string): Promise<void>;
  playMusic(name: string, options?: { loop?: boolean; volume?: number }): Promise<void>;
  stopMusic(): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setVolume(volume: number): Promise<void>;
  isMuted(): boolean;
  getVolume(): number;
}
```

### AssetLoader

Refactoriza `AssetLoader` para recibir `IAssetProvider`:

```ts
constructor(provider: IAssetProvider)
```

`AssetLoader` conserva:

* cache
* queue
* refCounts
* loadAll
* get
* incrementRef
* unloadGroup
* progress
* assertNoLeaks

Pero delega la carga real en `provider.load(asset)`.

### AudioSystem

Convierte `AudioSystem` del core en wrapper abstracto o interfaz. Las implementaciones concretas deben vivir fuera del core:

* WebAudioAudioPlayer
* ExpoAudioPlayer
* NoopAudioPlayer para headless/server

Si la app actual necesita audio, crea un adapter temporal en la ubicación existente para no romperla.

## Tarea G: BaseGame genérico

Refactoriza `BaseGame` para propagar genéricos:

```ts
export abstract class BaseGame<
  TState,
  TInput extends Record<string, unknown>,
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  protected world: World<TComponents, TEvents, TBlueprints>;
  protected eventBus: EventBus<TEvents>;
  protected blueprints: BlueprintRegistry<TComponents, TBlueprints>;

  getWorld(): World<TComponents, TEvents, TBlueprints>;

  protected abstract registerSystems(): void;
  protected abstract initializeEntities(): void;
  abstract getGameState(): TState;
  abstract isGameOver(): boolean;
}
```

Elimina de `BaseGame` cualquier dependencia directa de:

* `XPSystem`
* `PaletteSystem`
* `PlayerProfileService`
* eventos semánticos de Asteroids, Invaders o UI
* audio semántico hardcodeado como `ship:shoot`, `asteroid:destroyed`, `si:kill`, etc.

Si esos listeners son necesarios para la app actual, muévelos al juego consumidor o a un adapter `apps/asteroids`.

## Tarea H: estructura de paquetes mínima

Si el repo todavía no usa workspaces, prepara una estructura inicial sin romper Expo:

```txt
packages/
  core/
    src/
      ecs/
      events/
      assets/
      audio/
      runtime/
      math/
      physics/
      render/
    package.json
    tsconfig.json
```

El `package.json` de `packages/core` debe ser de librería, no de app:

```json
{
  "name": "@tiny-aster/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false,
  "files": ["dist", "README.md", "LICENSE"]
}
```

No publiques. Solo prepara.

## Tarea I: compatibilidad con la app existente

Después de crear el core genérico, adapta la app Asteroids actual para definir:

```ts
export type AsteroidsComponentRegistry = CoreComponentRegistry & {
  Asteroid: AsteroidComponent;
  Ship: ShipComponent;
  Invader: InvaderComponent;
  Bullet: BulletComponent;
  Ball: BallComponent;
  EnemyTag: EnemyTagComponent;
};

export type AsteroidsEventRegistry = {
  "ship:damaged": { shipEntity: Entity; damageAmount: number };
  "ship:destroyed": { shipEntity: Entity; finalScore: number };
  "asteroid:split": { parentEntity: Entity; size: string };
  "asteroid:destroyed": { entity: Entity; points: number };
  "score:changed": { newScore: number };
};
```

Define los blueprints concretos de Asteroids fuera del core.

Ejemplo:

```ts
export type AsteroidsBlueprintRegistry = {
  asteroid: BlueprintDefinition<AsteroidsComponentRegistry, {
    x: number;
    y: number;
    size: "large" | "medium" | "small";
    speed?: number;
  }>;

  projectile: BlueprintDefinition<AsteroidsComponentRegistry, {
    x: number;
    y: number;
    angle: number;
    ownerId?: string;
  }>;
};
```

## Tarea J: tests obligatorios

Añade tests runtime y tests de tipos.

### Tests runtime

Verifica:

1. `World<AsteroidsComponentRegistry>` añade, lee y muta componentes de juego.
2. `query("Transform", "Asteroid")` devuelve entidades correctas.
3. `EventBus<AsteroidsEventRegistry>` ejecuta `on`, `once`, `off`, `emitDeferred`, `flushDeferred`.
4. `BlueprintRegistry` crea una entidad sin que el core conozca `Asteroid`.
5. `AssetLoader` usa un `FakeAssetProvider`.
6. `NoopAudioPlayer` funciona en entorno headless.

### Tests de tipos

Crea tests con `tsd` o con archivos `.ts` usados por `tsc`.

Debe compilar:

```ts
world.addComponent(entity, { type: "Asteroid", size: "large" });
world.getComponent(entity, "Asteroid")?.size;
eventBus.emit("ship:damaged", { shipEntity: entity, damageAmount: 10 });
commandBuffer.spawnFromBlueprint("asteroid", { x: 1, y: 2, size: "large" });
```

Debe fallar con `@ts-expect-error`:

```ts
// @ts-expect-error unknown component
world.getComponent(entity, "Unknown");

// @ts-expect-error invalid Asteroid payload
world.addComponent(entity, { type: "Asteroid", invalid: true });

// @ts-expect-error wrong event payload
eventBus.emit("ship:damaged", { fuego: true });

// @ts-expect-error wrong blueprint args
commandBuffer.spawnFromBlueprint("asteroid", { x: 1, y: 2, color: "red" });
```

## Tarea K: criterios de aceptación

La tarea se considera terminada solo si:

1. `World` ya no depende directamente de `AnyCoreComponent`.
2. `ComponentOf` antiguo no es necesario para tipar componentes de juego.
3. El core no importa blueprints concretos de Asteroids/Invaders/UFO/Projectile.
4. `spawnFromBlueprint` delega en un registry/factory inyectado.
5. `EventBus` es genérico y conserva deferred events.
6. `AssetLoader` no carga recursos directamente; usa `IAssetProvider`.
7. `AudioSystem` no depende directamente de Web Audio, Expo ni React Native dentro del core.
8. Colisiones, comandos y haptics no contienen semántica hardcodeada de juego en el core.
9. La app existente sigue compilando o queda con una capa legacy claramente aislada.
10. Hay tests de runtime y tests de tipos.
11. La superficie pública exportada por el core queda documentada en `index.ts`.
12. No se ha hecho `npm publish`.

## Forma de trabajo esperada

Trabaja en pasos pequeños:

1. Auditoría de acoplamientos.
2. Introducción de tipos genéricos sin cambiar comportamiento.
3. Migración de `World`.
4. Migración de `EventBus`.
5. Migración de `BlueprintRegistry`.
6. Abstracción de assets/audio.
7. Limpieza de constantes hardcodeadas.
8. Adaptación de Asteroids como consumidor.
9. Tests.
10. Informe final.

En el informe final incluye:

* archivos modificados,
* decisiones de arquitectura,
* compatibilidad rota, si existe,
* comandos ejecutados,
* errores pendientes,
* próximos pasos recomendados para convertir esto en monorepo npm real.

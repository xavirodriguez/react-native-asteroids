# ROL Y OBJETIVO

Eres un Lead Technical Documenter especializado en motores de juego ECS (Entity-Component-System)
y TypeScript. Tu objetivo es mejorar INCREMENTALMENTE la documentación TSDoc del repositorio
`react-native-asteroids` para que cualquier desarrollador pueda detectar fallos conceptuales
leyendo únicamente los comentarios del código.

# CONTEXTO DEL PROYECTO

Este es un motor de juego arcade (TinyAsterEngine) construido con:
- **Arquitectura**: ECS puro en `src/engine/` con World, Systems, Components y Entity pooling.
- **Game Loop**: Fixed timestep a 60Hz con patrón acumulador en `src/engine/core/GameLoop.ts`.
- **Juegos**: Asteroids, Space Invaders, Flappy Bird, Pong en `src/games/`.
- **UI**: React Native + Expo. Sincronización engine→React via `useGame` hook (push-pull).
- **Renderizado**: Canvas, Skia y SVG como backends intercambiables.
- **Multiplayer**: Colyseus con client-side prediction.
- **Determinismo**: `RandomService` (Mulberry32) para aleatoriedad reproducible.

# SISTEMA DE PRIORIZACIÓN INCREMENTAL

Cada ejecución nocturna DEBE seguir este orden de prioridad. Avanza al siguiente nivel
solo cuando el anterior esté completo al 100% en los archivos tocados esa noche.

## Nivel 1 — Contratos e Invariantes (CRÍTICO para detectar fallos)
Documenta en CADA función/método público y protegido:

```typescript
/**
 * @precondition  — Qué DEBE ser verdad antes de llamar a este método.
 * @postcondition — Qué GARANTIZA este método al terminar.
 * @invariant     — Qué propiedad se mantiene siempre verdadera durante y después.
 * @throws        — Bajo qué condiciones exactas lanza una excepción.
 * @sideEffect    — Qué estado externo muta (world.version++, eventBus.emit, etc.).
 */
```

Ejemplo concreto para este proyecto:
```typescript
/**
 * Attaches a component to an entity.
 *
 * @precondition `entity` debe existir en `activeEntities`. Si el componente es
 *   `Transform` con `parent`, el parent debe existir en el World.
 * @postcondition `world.version` se incrementa en 1. El componente anterior
 *   del mismo tipo (si existía) queda sobrescrito sin cleanup.
 * @invariant Una entidad nunca puede ser su propio parent (self-reference).
 * @throws {Error} Si `entity === component.parent` (auto-referencia).
 * @sideEffect Invalida todas las queries cacheadas del tipo de componente afectado.
 *
 * @param entity - ID de la entidad destino.
 * @param component - Instancia del componente a adjuntar.
 */
addComponent<T extends Component>(entity: Entity, component: T): void
```

## Nivel 2 — Semántica de Dominio ECS
Para cada System, Component e Interface, documenta:

- **@responsibility** — Frase única que describe la responsabilidad del sistema.
- **@queries** — Qué componentes consulta del World y por qué.
- **@mutates** — Qué componentes modifica.
- **@emits** — Qué eventos emite al EventBus.
- **@dependsOn** — Qué otros sistemas deben ejecutarse ANTES.
- **@executionOrder** — Posición esperada en la cadena de update.

Ejemplo:
```typescript
/**
 * @responsibility Detecta colisiones circle-to-circle con broadphase de Spatial Hash.
 * @queries ["Transform", "Collider"] — Necesita posición y geometría de colisión.
 * @mutates Ninguno directamente; delega a `onCollision()` del subclase.
 * @dependsOn MovementSystem (las posiciones deben estar actualizadas este frame).
 * @executionOrder Después de MovementSystem, antes de cualquier sistema de respuesta.
 */
```

## Nivel 3 — Detección de Code Smells Documentados
Cuando encuentres patrones sospechosos, NO los corrijas, pero documéntalos con:

```typescript
/** @conceptualRisk [CATEGORÍA] Descripción del riesgo y por qué podría ser un fallo. */
```

Categorías obligatorias a buscar:
- `[DETERMINISM]` — Uso de `Math.random()`, `Date.now()` en lógica de gameplay.
- `[MEMORY]` — Cachés que crecen sin límite, listeners sin cleanup.
- `[TYPE_SAFETY]` — Casteos `as any`, tipos duplicados entre `EngineTypes.ts` y `CoreTypes.ts`.
- `[COUPLING]` — Dependencias circulares, imports de game-specific en engine core.
- `[OWNERSHIP]` — Componente mutado por múltiples sistemas sin orden definido.
- `[LIFECYCLE]` — Recursos que se crean en `start()` pero no se liberan en `destroy()`.
- `[DEPRECATED_USAGE]` — Código que usa APIs marcadas como `@deprecated`.
- `[GC_PRESSURE]` — Creación de objetos/arrays efímeros en hot paths (update loops).

## Nivel 4 — Documentación de Interfaces Públicas
Para cada archivo en `src/engine/core/` y `src/engine/systems/`:
- `@module` con descripción de una línea.
- `@packageDocumentation` en el barrel export (`src/engine/index.ts`).
- `@example` con snippet ejecutable para cada clase pública.
- `@see` con referencias cruzadas a sistemas/componentes relacionados.

## Nivel 5 — Cobertura de Tipos y Componentes
Para cada interface de Component en `CoreComponents.ts` y `EngineTypes.ts`:
- Documentar cada campo con su unidad (`pixels`, `radians`, `milliseconds`, `normalized 0-1`).
- Documentar valores por defecto esperados.
- Documentar rangos válidos.

```typescript
export interface TransformComponent extends Component {
  type: "Transform";
  /** Posición horizontal en pixels, espacio del World. */
  x: number;
  /** Posición vertical en pixels, espacio del World. */
  y: number;
  /** Rotación en radianes. Rango: [0, 2π). Sentido horario. */
  rotation: number;
  /** Escala horizontal. Default: 1.0. Valores negativos invierten el eje. */
  scaleX: number;
  // ...
}
```

# REGLAS DE FORMATO TSDOC

1. Usa SIEMPRE la especificación TSDoc de `@microsoft/tsdoc` (ya instalado en el proyecto).
2. Primera línea: descripción concisa en imperativo ("Crea...", "Detecta...", "Gestiona...").
3. `@remarks` para contexto arquitectónico extendido.
4. `@param` con tipo implícito (no repetir el tipo TS, sí describir semántica).
5. `@returns` describiendo el significado del valor, no solo el tipo.
6. `@link` usando `{@link NombreClase}` para referencias cruzadas.
7. Idioma: ESPAÑOL para descripciones, INGLÉS para tags TSDoc estándar.
8. Máximo 100 caracteres por línea en comentarios.

# REGLAS DE EJECUCIÓN NOCTURNA

1. **Scope por ejecución**: Procesa MÁXIMO 5 archivos por noche, priorizando:
   a. Archivos sin NINGÚN TSDoc (0 comentarios `/** */`).
   b. Archivos con `as any` o casteos inseguros.
   c. Archivos en `src/engine/core/` (máxima criticidad).
   d. Archivos en `src/engine/systems/`.
   e. Archivos en `src/games/*/systems/`.

2. **No romper código**: Solo modificar/añadir bloques `/** */`. NUNCA cambiar lógica.

3. **Fichero de estado**: Actualizar `docs/tsdoc-audit-state.json` con:
   ```json
   {
     "lastRun": "2026-04-08",
     "filesProcessed": ["src/engine/core/World.ts"],
     "coverageByLevel": {
       "level1_contracts": { "done": 12, "total": 87 },
       "level2_ecs_semantics": { "done": 3, "total": 45 },
       "level3_risks_found": 7,
       "level4_public_api": { "done": 5, "total": 32 },
       "level5_component_fields": { "done": 22, "total": 156 }
     },
     "conceptualRisksFound": [
       {
         "file": "src/engine/systems/CollisionSystem.ts",
         "line": 33,
         "category": "TYPE_SAFETY",
         "description": "Casteo `as any` para acceder a layer/mask no tipados en ColliderComponent"
       }
     ],
     "nextPriority": ["src/engine/core/BaseGame.ts", "src/engine/core/EntityPool.ts"]
   }
   ```

4. **Informe de cambios**: Crear/actualizar `docs/tsdoc-nightly-changelog.md` con:
   ```markdown
   ## [2026-04-08] Noche #N
   ### Archivos documentados
   - `src/engine/core/World.ts` — Nivel 1 completo (12 contratos añadidos)
   ### Riesgos conceptuales detectados
   - ⚠️ `[TYPE_SAFETY]` CollisionSystem.ts:33 — `(col as any).layer` sin tipo
   - ⚠️ `[GC_PRESSURE]` World.ts:131 — `[...componentTypes].sort()` crea array en hot path
   ### Métricas
   - Cobertura TSDoc: 14% → 18% (+4%)
   - Contratos documentados: 12/87
   ```

5. **Idempotencia**: Si un archivo ya tiene documentación de un nivel, VERIFICAR que sea
   correcta y coherente con el código actual. Si el código cambió y la doc es incorrecta,
   ACTUALIZAR la doc y registrar el cambio como `[DOC_DRIFT]` en el changelog.

# ANTI-PATRONES A EVITAR

- ❌ NO generar comentarios triviales ("This method does X" repitiendo el nombre del método).
- ❌ NO documentar getters/setters obvios de una línea.
- ❌ NO inventar comportamiento que no esté en el código — si no estás seguro, usa
  `@conceptualRisk [UNCLEAR] Comportamiento no determinable sin tests`.
- ❌ NO duplicar información que ya esté en `docs/*.md` — usar `@see` para referenciar.
- ❌ NO añadir `@param` sin valor semántico adicional al tipo TS.

# CRITERIO DE ÉXITO

La documentación es exitosa cuando un desarrollador nuevo puede:
1. Leer SOLO los TSDoc de un System y saber qué componentes necesita y en qué orden ejecutar.
2. Leer SOLO los TSDoc de un método y saber si lo está llamando con precondiciones válidas.
3. Buscar `@conceptualRisk` en el repo y obtener una lista priorizada de deuda técnica.
4. Detectar si un cambio en un System rompe el contrato de otro System sin ejecutar tests.

# INICIO

Lee `docs/tsdoc-audit-state.json` (créalo si no existe). Determina los 5 archivos
prioritarios según las reglas. Aplica los niveles de documentación en orden.
Actualiza el estado y el changelog. Commitea con mensaje:
`docs(tsdoc): nightly audit — N archivos, M contratos, K riesgos [skip ci]`
```

---

### Por qué este prompt funciona para detectar fallos conceptuales

| Mecanismo | Qué detecta |
|---|---|
| `@precondition` / `@postcondition` | Llamadas a métodos con estado inválido (ej: `addComponent` en entidad destruida) |
| `@invariant` | Violaciones de reglas que deben ser siempre verdaderas (ej: entidad no puede ser su propio parent) |
| `@dependsOn` / `@executionOrder` | Sistemas ejecutados en orden incorrecto (ej: `CollisionSystem` antes de `MovementSystem`) |
| `@conceptualRisk [DETERMINISM]` | Uso de `Math.random()` o `Date.now()` en gameplay que rompe replays/multiplayer |
| `@conceptualRisk [TYPE_SAFETY]` | Los múltiples `as any` en `CollisionSystem.ts` líneas 33-38 que ocultan campos no tipados |
| `@conceptualRisk [OWNERSHIP]` | Componentes mutados por múltiples sistemas sin contrato claro |
| `@sideEffect` | Efectos colaterales ocultos como `world.version++` que invalidan cachés |
| `[DOC_DRIFT]` en changelog | Código que evolucionó pero cuya documentación quedó obsoleta | [1](#0-0) [2](#0-1) [3](#0-2) [4](#0-3) [5](#0-4) [6](#0-5) [7](#0-6) [8](#0-7) [9](#0-8) [10](#0-9) 

### Notas de implementación

- El prompt está calibrado para los **5 niveles de prioridad** específicos de tu codebase, empezando por contratos (lo más útil para detectar bugs) y terminando por cobertura de campos.
- El fichero `docs/tsdoc-audit-state.json` actúa como **memoria persistente** entre ejecuciones, evitando trabajo duplicado y permitiendo medir progreso.
- El límite de **5 archivos por noche** es deliberado: fuerza profundidad sobre amplitud, y evita PRs gigantes difíciles de revisar.
- Las categorías de `@conceptualRisk` están extraídas directamente de los hallazgos reales de tus `TECHNICAL_REVIEW.md` y `TECHNICAL_REVIEW_DAILY.md` (divergencia de física, `Math.random()`, GC pressure, casteos `as any`).

### Citations

**File:** src/engine/core/World.ts (L53-76)
```typescript
  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type;

    // Principle 2: Strong Invariants - Normalizar en addNode (addComponent en ECS)
    if (type === "Transform") {
      const transform = component as any;
      if (transform.parent !== undefined) {
        if (!this.activeEntities.has(transform.parent)) {
          if (__DEV__) {
            console.warn(`Hierarchy Invariant Violation: Entity ${entity} has parent ${transform.parent} but parent does not exist in world.`);
          }
          transform.parent = undefined; // Normalizar SIEMPRE
        } else if (transform.parent === entity) {
          throw new Error(`Hierarchy Invariant Violation: Entity ${entity} cannot be its own parent.`);
        }
      }
    }

    this.ensureComponentStorage(type);

    this.componentMaps.get(type)?.set(entity, component);
    this.componentIndex.get(type)?.add(entity);
    this.version++;
  }
```

**File:** src/engine/systems/CollisionSystem.ts (L30-38)
```typescript
      const pos = world.getComponent<TransformComponent>(id, "Transform")!;
      const col = world.getComponent<ColliderComponent>(id, "Collider")!;

      const layer = (col as any).layer !== undefined ? (col as any).layer : 1;
      const mask = (col as any).mask !== undefined ? (col as any).mask : 1;
      if (layer === 0 && mask === 0) continue;

      const radius = col.radius || (col as any).size / 2 || 0;
      const halfWidth = (col as any).width ? (col as any).width / 2 : radius;
```

**File:** src/engine/core/BaseGame.ts (L16-21)
```typescript
/**
 * Abstract base class for all games.
 * Provides boilerplate for lifecycle management, input, and listeners.
 */
export abstract class BaseGame<TState, TInput extends Record<string, any>>
  implements IGame<BaseGame<TState, TInput>> {
```

**File:** src/engine/core/GameLoop.ts (L1-12)
```typescript
/**
 * Manages the game heartbeat and system updates using a fixed timestep.
 *
 * @remarks
 * Uses an accumulator pattern to ensure consistent physics/logic updates (60 FPS)
 * regardless of the rendering framerate.
 */

export interface LoopConfig {
  fixedHz?: number; // default: 60
  maxDeltaMs?: number; // default: 100 (evita spiral of death)
}
```

**File:** src/engine/core/IGame.ts (L9-30)
```typescript
/**
 * Generic interface that EVERY game must implement.
 * TGame = the concrete game type (for strong typing in subscribe).
 */
export interface IGame<TGame = unknown> {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  restart(): void | Promise<void>;
  destroy(): void;
  getWorld(): World;
  isPausedState(): boolean;
  isGameOver(): boolean;
  setInput(input: Record<string, boolean>): void;
  subscribe(listener: UpdateListener<TGame>): () => void;
  /**
   * Returns the current game state.
   * Overridden by each game with its specific type.
   */
  getGameState(): unknown;
}
```

**File:** src/engine/core/CoreComponents.ts (L21-35)
```typescript
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  parent?: Entity;
  // World space cache (managed by HierarchySystem)
  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}
```

**File:** TECHNICAL_REVIEW.md (L1-5)
```markdown
# Daily Technical Review Report: TinyAsteroids Engine & Retro Arcade

### 1. Resumen ejecutivo

El proyecto se encuentra en una fase de consolidación arquitectónica tras una serie de refactorizaciones clave que han elevado el motor ECS (`TinyAsterEngine`) a un nivel de madurez alto. La implementación de un loop de paso fijo (fixed timestep), el determinismo mediante `RandomService` y el sistema de consultas con caché en el `World` son aciertos técnicos sobresalientes. Sin embargo, existe una **divergencia arquitectónica crítica**: coexisten dos motores (un ECS estable y una rama experimental con Matter.js en `src/app/GameEngine.tsx`) que duplican responsabilidades y tipos (`CoreTypes.ts` vs `EngineTypes.ts`). La calidad del gameplay es excelente, con una separación clara de la UI, pero el riesgo de deriva técnica por esta duplicidad debe ser atajado para evitar confusión en el desarr ... (truncated)
```

**File:** TECHNICAL_REVIEW_DAILY.md (L39-57)
```markdown
### 3. Hallazgos prioritarios

#### Hallazgo 1: Divergencia en integración física
- **Severidad:** Alta
- **Evidencia:** `AsteroidsGame.ts` implementa integración de Euler manual en `predictLocalPlayer`, mientras que `src/game/GameEngine.tsx` usa `MatterPhysicsAdapter`.
- **Por qué importa:** Mantener dos formas de resolver física (manual vs motor) aumenta la deuda técnica y dificulta la implementación de colisiones complejas de forma uniforme.
- **Recomendación:** Formalizar el uso de un "SimplePhysicsSystem" para juegos arcade y reservar Matter.js para simulaciones de cuerpos rígidos, pero ambos bajo la misma interfaz `IPhysicsAdapter`.

#### Hallazgo 2: Fuga de determinismo por aleatoriedad no controlada
- **Severidad:** Media
- **Evidencia:** `PongGameStateSystem.ts` usa `Math.random()` en `resetBall`. `AsteroidsSkiaVisuals.ts` usa `Math.random()` para el efecto de estrellas.
- **Por qué importa:** Impide la implementación fiable de replays y puede causar desincronización en multiplayer autoritativo si la semilla no se comparte.
- **Recomendación:** Migrar todo uso de aleatoriedad al `RandomService` (Mulberry32) inyectando una semilla por partida/sesión.

#### Hallazgo 3: Presión de GC en el Render Snapshot
- **Severidad:** Media
- **Evidencia:** En `src/game/GameEngine.tsx`, se mapean todas las entidades a un nuevo array de objetos cada frame en `useFrameCallback`.
- **Por qué importa:** En React Native, la creación masiva de objetos efímeros en cada frame (60 veces por segundo) dispara el Garbage Collector, causando micro-stuttering (tirones) en dispositivos móviles.
- **Recomendación:** Implementar un pool de objetos para el snapshot o usar `SharedValue` de Reanimated de forma que solo se actualicen propiedades escalares en buffers pre-asignados.
```

**File:** src/engine/input/InputManager.ts (L1-11)
```typescript
import { InputController } from "./InputController";

/**
 * Centralized manager for handling multiple input sources.
 *
 * @deprecated Use UnifiedInputSystem instead for semantic action-based input.
 *
 * @remarks
 * The InputManager maintains a list of {@link InputController}s and aggregates
 * their states into a single, unified input state.
 */
```

**File:** src/engine/rendering/StarField.ts (L11-22)
```typescript
export function generateStarField(count: number, width: number, height: number): Star[] {
  const renderRandom = RandomService.getInstance("render");
  return Array.from({ length: count }, () => ({
    x: RandomService.next() * width,
    y: RandomService.next() * height,
    size: RandomService.next() * 1.5 + 0.5,
    brightness: RandomService.next() * 0.7 + 0.3,
    twinklePhase: 0,
    twinkleSpeed: 0,
    layer: 0,
  }));
}
```

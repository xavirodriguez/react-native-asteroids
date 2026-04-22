Actúa como un **staff engineer especializado en motores de videojuegos, simulación determinista, rollback netcode y arquitectura de PRNG por dominio**.

Tu misión es **corregir desde la causa raíz** un bug de no determinismo en `RandomService` dentro de un engine TypeScript. No quiero un parche local ni una migración cosmética. Quiero una solución que **restaure formalmente la separación entre randomness de gameplay y randomness de render**, impida regresiones y deje el sistema testeable.

## Contexto del bug

El engine pretende tener streams PRNG separados por dominio:

* `"gameplay"` → simulación determinista, replay, rollback, spawn, IA, colisiones, decisiones de gameplay.
* `"render"` → partículas, screen shake, VFX y otros efectos visuales no autoritativos.
* `"global"` / métodos estáticos → stream legado que hoy actúa como escape hatch inseguro.

El bug real es arquitectónico:

1. Los métodos estáticos de `RandomService` consumen `globalInstance`.
2. Código de gameplay usa esos métodos estáticos.
3. `lockGameplayContext` solo protege acceso a `"render"`, pero **no protege el leak `static -> global`**.
4. Eso permite que gameplay consuma un stream no determinista o no controlado durante forward sim, replay o rollback.
5. Además, `BaseGame` consume `"gameplay"` antes de sembrarlo cuando no recibe seed explícita.

## Evidencia relevante

### `BaseGame`

```ts
this.currentSeed = (config.gameOptions?.seed as number) ?? RandomService.getInstance("gameplay").nextInt(0, 0xFFFFFFFF);
RandomService.setSeed(this.currentSeed);
RandomService.getInstance("gameplay").setSeed(this.currentSeed);
```

### `RandomService.getInstance()`

```ts
public static getInstance(name: string = "global", initialSeed: number = 12345): RandomService {
  if (this.lockGameplayContext && name === "render") {
      console.warn("[RandomService] Accessing 'render' instance during gameplay simulation! This will break determinism.");
      if (__DEV__) {
          // throw new Error("Deterministic violation: 'render' random accessed during simulation.");
      }
  }

  if (name === "global") return this.globalInstance;
```

### Métodos estáticos inseguros

```ts
public static next(): number {
  return this.globalInstance.next();
}

public static nextRange(min: number, max: number): number {
  return this.globalInstance.nextRange(min, max);
}

public static nextInt(min: number, max: number): number {
  return this.globalInstance.nextInt(min, max);
}
```

### Sitios conocidos con uso incorrecto

* `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`
* `src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts`
* `src/games/flappybird/systems/FlappyBirdGameStateSystem.ts`
* `src/games/pong/EntityFactory.ts`
* `src/engine/systems/ParticleSystem.ts`
* `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts`

### Patrón correcto de referencia

```ts
if (ctx?.isResimulating) return;

// Particles are visual only, use render random
const renderRandom = RandomService.getInstance("render");
```

## Diagnóstico que debes asumir como cierto

* El bug no es solo de implementación; es un **defecto de diseño de API**.
* El problema principal no es que exista `render`, sino que **existe un camino fácil y silencioso hacia `globalInstance` desde gameplay**.
* No quiero una solución que redirija silenciosamente `static -> gameplay`, porque eso escondería errores de capa.
* Quiero que el sistema haga que el uso correcto sea natural y que el uso incorrecto falle ruidosamente en desarrollo.

---

# Objetivo de arquitectura

Debes dejar el sistema con estas invariantes:

1. **Toda lógica determinista de gameplay consume exclusivamente el stream `"gameplay"`**.
2. **Toda lógica visual/no autoritativa consume exclusivamente el stream `"render"`**.
3. **El stream `"global"` queda explícitamente marcado como legado/no apto para gameplay**.
4. **Durante simulación determinista o resimulación, acceder a `"render"` o `"global"` desde rutas prohibidas debe advertir o lanzar error en dev**.
5. **Los métodos estáticos de `RandomService` no deben ser utilizables silenciosamente dentro de gameplay**.
6. **La inicialización de seed no debe consumir ningún stream antes de sembrarlo**.
7. **La solución debe ser verificable con tests, no solo “plausible” por inspección**.

---

# Lo que debes hacer

## 1. Proponer la solución de raíz

Primero explica brevemente:

* cuál es la causa raíz,
* por qué el diseño actual la permite,
* cuál es la estrategia correcta para resolverla.

Tu estrategia debe priorizar:

* corrección arquitectónica,
* guardrails fuertes,
* bajo riesgo de reintroducción del bug.

## 2. Endurecer `RandomService`

Quiero una propuesta concreta de refactor para `RandomService` con estas propiedades:

### A. Streams tipados

Introduce una abstracción explícita para los nombres de stream, por ejemplo:

* `type RandomStreamName = "gameplay" | "render" | "global"`
  o
* `enum RandomStreamName`

Elimina strings mágicos donde sea razonable.

### B. Guardrails reales

Refuerza los guards para que durante `lockGameplayContext`:

* `getInstance("render")` falle o avise en dev,
* `getInstance("global")` falle o avise en dev,
* **todos los métodos estáticos** (`next`, `nextRange`, `nextInt`, `chance`, `nextSign`, `setSeed`, etc.) fallen o avisen en dev,
* el mensaje de error indique exactamente qué API debe usarse en su lugar.

### C. Helpers ergonómicos

Añade helpers explícitos como:

* `getGameplayRandom()`
* `getRenderRandom()`

La API correcta debe ser más cómoda que la incorrecta.

### D. Semántica explícita de `"global"`

Debes decidir y justificar una de estas dos rutas:

#### Ruta preferida

Mantener `"global"` solo como compatibilidad legado, con documentación y guardrails duros para impedir su uso en gameplay.

#### Ruta más estricta

Reducir o deprecar agresivamente `"global"` si casi no aporta valor arquitectónico.

No quiero que conviertas silenciosamente `"global"` en alias de `"gameplay"`.

## 3. Corregir `BaseGame` desde el lifecycle

Corrige la inicialización de seed para que:

* no consuma `"gameplay"` antes de sembrarlo,
* use una fuente de entropía externa solo para la seed inicial si no se provee una seed,
* inicialice explícitamente los streams de forma coherente.

### Importante

No dejes `Math.random()` regado ad hoc dentro del código de inicialización.
Encapsúlalo en una utilidad clara, por ejemplo:

* `generateExternalSeed()`
* o una función privada equivalente

Debe quedar obvio que esa entropía está permitida **solo fuera de la simulación**.

### Decisión obligatoria

Debes decidir también qué hacer con la seed de `"render"`:

* o usar la misma seed por reproducibilidad visual,
* o derivar una seed separada desde `currentSeed` para evitar correlaciones accidentales entre streams.

No elijas arbitrariamente: justifica la decisión.

Si eliges derivarla, implementa algo simple y estable, por ejemplo una función `deriveSeed(baseSeed, "render")`.

## 4. Migrar todos los call sites incorrectos

Debes localizar y corregir todos los usos de métodos estáticos de `RandomService` en gameplay y render.

Como mínimo, corrige estos:

* `SpaceInvadersCollisionSystem`
* `SpaceInvadersFormationSystem`
* `FlappyBirdGameStateSystem`
* `Pong EntityFactory`
* `ParticleSystem`
* `SpaceInvadersCanvasVisuals`

### Regla de clasificación

No asumas por nombre si algo es gameplay o render. Determínalo por efecto semántico:

* si afecta estado autoritativo, componentes simulados, rollback, replay o decisiones de gameplay → `"gameplay"`
* si solo afecta presentación visual local → `"render"`

### Punto importante

Revisa específicamente si `SpaceInvadersCollisionSystem.createExplosion()` crea:

* entidades/estado simulados reales,
* o solo efectos visuales.

No quiero una migración automática incorrecta de ese método a `"gameplay"` si en realidad es render.

## 5. Añadir barreras contra regresión

Añade mecanismos para que el bug no vuelva a entrar fácilmente. Considera varias capas:

* warnings o throws en dev,
* comentarios de intención,
* helpers tipados,
* anotaciones `@deprecated` sobre los estáticos,
* opcionalmente una regla o patrón que facilite detectar usos futuros.

No basta con “cambiar los call sites”; quiero **hacer el error difícil de cometer**.

## 6. Tests obligatorios

Quiero tests reales. Como mínimo, implementa o propone con precisión estos:

### Test 1 — aislamiento de streams

Consumir `"render"` no altera el estado ni la secuencia de `"gameplay"`.

**Ojo:** no hagas un falso test que solo pruebe que reseedear devuelve la misma secuencia. Debes demostrar aislamiento real entre streams.

### Test 2 — determinismo de gameplay

Con la misma seed, dos corridas de gameplay producen exactamente la misma secuencia.

### Test 3 — guard de contexto

Durante `lockGameplayContext`:

* acceder a `"render"` falla o avisa,
* acceder a `"global"` falla o avisa,
* llamar métodos estáticos falla o avisa,
* acceder a `"gameplay"` sigue permitido.

### Test 4 — rollback/resim

Una resimulación no debe divergir de una corrida equivalente por culpa de consumo de render o global.

### Test 5 — inicialización limpia

La inicialización de `BaseGame` o de la utilidad equivalente no debe consumir `"gameplay"` antes de sembrarlo.

### Test 6 — seed derivada de render, si implementas esa opción

Si decides derivar la seed de `"render"`, prueba que:

* `"gameplay"` y `"render"` arrancan desacoplados,
* la derivación es estable para una misma seed base.

## 7. Criterios de aceptación

La solución solo vale si se cumplen todos estos puntos:

* no queda gameplay usando `RandomService.next*()` estático;
* `global` ya no puede colarse silenciosamente durante simulación;
* `lockGameplayContext` protege tanto `render` como `global` y los métodos estáticos;
* `BaseGame` deja de consumir `"gameplay"` antes de sembrarlo;
* la política de seed de `"render"` queda explícita y justificada;
* los tests cubren aislamiento, determinismo, guards y lifecycle;
* no se introduce una redirección silenciosa `static -> gameplay`.

---

# Restricciones

* No hagas una solución “mágica” que esconda errores de capa.
* Prefiero un sistema más estricto en dev y compatible en producción, antes que uno permisivo.
* Minimiza el tamaño del refactor, pero no a costa de dejar la arquitectura ambigua.
* Si detectas más call sites incorrectos, inclúyelos.
* Si una decisión depende del significado semántico de una función, inspecciónala antes de migrarla.

---

# Formato exacto de tu respuesta

Responde en este orden:

1. **Causa raíz**
2. **Decisiones de diseño**
3. **Plan de refactor**
4. **Diffs o snippets exactos por archivo**
5. **Tests**
6. **Riesgos y follow-ups**

---

# Prioridad de implementación

Haz el trabajo en este orden:

1. endurecer `RandomService`,
2. encapsular generación de seed externa,
3. corregir `BaseGame`,
4. inspeccionar y migrar call sites,
5. añadir tests,
6. listar follow-ups opcionales.

Tu objetivo final es **cerrar el agujero arquitectónico `static/global -> gameplay`** y restaurar una separación estricta, explícita y verificable entre randomness de simulación y randomness visual.

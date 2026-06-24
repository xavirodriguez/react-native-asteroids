### 📋 LISTA MAESTRA DE TAREAS (TODO.md)

#### FASE 0: Alinear BaseGame con useGame.ts

* [x] Tarea 0.1: Extender `packages/core/src/runtime/BaseGame.ts` (o crear `RunnableGame.ts` si es arquitectónicamente mejor) para implementar los métodos que `useGame.ts` requiere:
    * `init(): Promise<void>` (debe invocar internamente a `initialize()`)
    * `start(): void` (debe arrancar el `GameLoop`)
    * `destroy(): void` (detiene el loop y limpia recursos)
    * `subscribe(cb: (state: TState) => void): () => void`
    * `isPausedState(): boolean`
    * `restart(seed?: number): Promise<void>`
    * `getInputSystem(): InputSystem`

* [x] Tarea 0.2: Eliminar la dependencia legacy `require("../engine/debug/DebugManager")` en la línea 169 de `src/hooks/useGame.ts`. Mover la lógica necesaria o limpiar la llamada.

* **Criterio de éxito:** Ejecutar `pnpm --filter @tiny-aster/core typecheck` y que termine con código 0.

#### FASE 1: Completar packages/renderer-skia

* [ ] Tarea 1.1: `packages/renderer-skia/src/SkiaRenderer.ts` es actualmente un stub (`console.log`). Implementar la interfaz `Renderer<TRegistry, SkiaCanvas>` del core utilizando `@shopify/react-native-skia` para el dibujado real.
* [ ] Tarea 1.2: Configurar `packages/renderer-skia/package.json` para empaquetar con `tsup` (añadir script `build` idéntico al de `@tiny-aster/core`).

* **Criterio de éxito:** Ejecutar `pnpm --filter @tiny-aster/renderer-skia build` con éxito.

#### FASE 2: Completar los Juegos (Uno a la vez)

* [ ] Tarea 2.1: Migrar **Pong** (`src/games/pong/`). Crear su propio `ComponentRegistry` real (eliminar `ExampleRegistration`), extender el nuevo `BaseGame` adaptado y conectarlo con `SkiaRenderer` en `src/app/pong/index.tsx`.
* [ ] Tarea 2.2: Migrar **FlappyBird** (`src/games/flappybird/`). Crear la carpeta `components/`, definir `FlappyBirdComponentRegistry`, mapear entidades (pájaro/tuberías) y conectar su vista nativa.
* [ ] Tarea 2.3: Migrar **Space Invaders** (`src/games/space-invaders/`). Conectar el directorio `scenes/` al `SceneManager` del core mediante el `StateMachineSystem`.

* **Criterio de éxito por juego:** El typecheck general pasa y la pantalla del juego inicializa en Expo Go sin crashear.

#### FASE 3: Implementar packages/network-colyseus

* [ ] Tarea 3.1: Hacer que `packages/network-colyseus/src/ColyseusTransport.ts` implemente formalmente la interfaz `NetworkTransport` del core mapeando los métodos `connect`, `send`, `onMessage` y `disconnect`.

* **Criterio de éxito:** Ejecutar `pnpm --filter @tiny-aster/network-colyseus typecheck` sin errores.

#### FASE 4: Guardrail e Inmunidad Arquitectónica

* [ ] Tarea 4.1: Crear el script bash automatizado en `scripts/check-core-boundaries.sh` que analice `packages/core/src` y falle (exit 1) si encuentra imports prohibidos como `react-native`, `expo-*`, `@colyseus` o referencias directas a componentes de juegos específicos.

* **Criterio de éxito:** El script corre localmente y pasa de forma exitosa en una estructura limpia.

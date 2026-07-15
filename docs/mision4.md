### Prompt de Misión 4: Arquitectura Multiplayer (Migración al Core y Patrón Strategy de Replicación)

```markdown
Eres un Ingeniero de Software Senior especializado en TypeScript, desarrollo de servidores de videojuegos multijugador (Colyseus), arquitecturas monorepo (pnpm workspaces) y patrones de diseño de software. Tu misión es unificar el acceso a los juegos y sanear el sistema de replicación de red en el servidor.

Garantiza que tu intervención sea estrictamente idempotente.

## Directivas de Arquitectura (Obligatorias)

- **Portabilidad Absoluta (Headless Server):** Para lograr multiplayer autoritativo, el servidor de Colyseus debe ser capaz de importar la lógica de simulación de todos los juegos. Toda clase de juego debe residir en el paquete compartido (`packages/core`) y ser exportada por su punto de entrada público.
- **Principio de Abierto/Cerrado (OCP):** Los algoritmos de sincronización de red (legacy, delta, budget, etc.) no deben ser condicionales inline. Deben encapsularse bajo el Patrón Strategy para que añadir un nuevo modo de replicación no requiera modificar el bucle principal del servidor.

## Fase 0: Diagnóstico e Idempotencia

Antes de modificar ningún archivo, verifica el estado actual:

1. Comprueba la ubicación de los juegos. Verifica si `flappybird`, `pong` y `space-invaders` siguen en `src/games/` (nivel de app de Expo) o si ya han sido migrados a `packages/core/src/games/`.
2. Inspecciona `server/src/AsteroidsRoom.ts`. Busca el método `update()` o similar que contenga un bloque `if/else` gigante para decidir el modo de replicación (legacy, interest, delta, budget, binary).
   Si los juegos ya están en el paquete core y el servidor de Colyseus ya consume estrategias de replicación polimórficas, documenta que el entorno está sano y **termina la ejecución sin hacer cambios**.

## Misión 1: Migración al Core (Habilitar Multiplayer Autoritativo)

Si la Fase 0 detecta los juegos en la carpeta de la app:

1. Mueve físicamente los directorios de juego de la app Expo a `packages/core/src/games/`:
   - `src/games/flappybird` -> `packages/core/src/games/flappybird`
   - `src/games/pong` -> `packages/core/src/games/pong`
   - `src/games/space-invaders` -> `packages/core/src/games/space-invaders`
2. Exporta estas clases de juego desde el punto de entrada público de `@tiny-aster/core` (ej. `packages/core/src/index.ts`).
3. Actualiza los imports de estos juegos en la aplicación cliente de Expo para que ahora los consuman directamente desde la librería `@tiny-aster/core` en lugar de paths locales.

## Misión 2: Patrón Strategy para Replicación de Red (AsteroidsRoom.ts)

Si la Fase 0 detecta el bloque condicional gigante de replicación:

1. Crea una interfaz `ReplicationStrategy` en el servidor (o en un paquete compartido de red) con una firma clara, por ejemplo:
   `replicate(room: any, clients: any[], state: any, tick: number): void;`
2. Extrae cada rama del `if/else` gigante en una clase concreta que implemente esta interfaz:
   - `DeltaReplicationStrategy`
   - `BudgetReplicationStrategy`
   - `InterestReplicationStrategy`
   - `BinaryReplicationStrategy`
   - `LegacyReplicationStrategy`
3. Refactoriza `AsteroidsRoom` para que reciba e instancie la estrategia correcta en su inicialización (utilizando una factoría sencilla o inyección directa) y delega la replicación en el `update()` del servidor llamando simplemente a `this.replicationStrategy.replicate(...)`.

## Validación Final

1. Ejecuta el typechecker global del monorepo (`pnpm tsc --noEmit` o equivalente) para asegurar que tanto la App de Expo como el Servidor Colyseus compilan perfectamente utilizando los nuevos paths de `@tiny-aster/core`.
2. Ejecuta los tests del core (`pnpm --filter @tiny-aster/core test`) y los tests del servidor si existen.
3. Imprime un reporte de refactorización confirmando que las clases de los juegos ahora son importables por el servidor y que la replicación condicional ha sido desacoplada.
```

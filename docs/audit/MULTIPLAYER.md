# Multiplayer & Network Synchronization Audit - TinyAster

This document audits the authoritative multiplayer architecture, network protocol, client-side prediction, rollback/reconciliation, and the implementation of network simulation subsystems.

---

## Technical Audit Findings

### 1. Massive Physics Integration Scale Discrepancy (Unavoidable Desync)

## Título
Desastre de Sincronismo: Discrepancia Escalar en la Integración Física de Reconciliación (Milisegundos vs Segundos)

## Severidad
Critical

## Categoría
Sincronización

## Ubicación
`packages/core/src/network/ReplicationSystem.ts` (líneas 37-52, 79-94) contra `packages/core/src/physics/systems/MovementSystem.ts`

## Descripción
Existe un error matemático crítico en las escalas temporales aplicadas para integrar la física del juego. El sistema físico estándar `MovementSystem` multiplica de forma directa los vectores de velocidad por la variable `deltaTime` (que se pasa en milisegundos, por ejemplo, `16.66` para representar 60 FPS). Sin embargo, el bucle de reconciliación y predicción en `ReplicationSystem` divide la variable de tiempo entre 1000 (`deltaTime / 1000` y `dt / 1000`), asumiendo erróneamente que las velocidades del motor están expresadas en unidades por segundo. Debido a esta discrepancia de escala de tres órdenes de magnitud (1000x), la simulación local del cliente y el proceso de reconciliación calculan posiciones radicalmente diferentes para la misma fuerza física de impulso aplicada.

## Evidencia
En `packages/core/src/physics/systems/MovementSystem.ts` (escala en Milisegundos):
```typescript
  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity");
    for (const entity of entities) {
      const v = world.getComponent(entity, "Velocity")!;
      world.mutateComponent(entity, "Transform", (t) => {
        t.x += v.vx * deltaTime; // Se multiplica directamente por ms (ej: vx * 16.66)
        t.y += v.vy * deltaTime;
```
En `packages/core/src/network/ReplicationSystem.ts` (escala dividida en Segundos):
```typescript
            // Client-Side Prediction: apply input locally before server confirmation
            if (input.thrust) {
                const power = 150;
                const ax = Math.cos(transform.rotation) * power;
                const ay = Math.sin(transform.rotation) * power;
                velocity.vx += ax * (deltaTime / 1000); // Se divide por 1000
                velocity.vy += ay * (deltaTime / 1000);
            }
```

## Consecuencias
- **Warping y Teletransportes Inevitables**: En cuanto el cliente recibe cualquier actualización de red autoritativa del servidor y ejecuta el método `reconcile()`, la nave espacial experimenta un salto espacial gigantesco (se teletransporta miles de píxeles fuera de la pantalla de forma instantánea) debido al desfase de escala de velocidad. El juego multijugador es físicamente injugable bajo estas condiciones.

## Solución propuesta
Consolidar de manera estricta la unidad de tiempo del motor físico. Si la física opera en unidades por segundo, se debe dividir el `deltaTime` por 1000 uniformemente en *todos* los sistemas (incluido `MovementSystem`), o de lo contrario, si se prefiere operar en milisegundos, eliminar la división por 1000 en el `ReplicationSystem` para que ambas partes compartan exactamente la misma escala matemática de simulación.

## Dificultad
Alta

## Prioridad
P0

## Dependencias
Ninguna.

---

### 2. Fake Subsystems: Network Delta and Budget Managers are Dummy Stubs

## Título
Subsistemas Fantasma: Las Tecnologías de Delta Compression y Network Budgeting son Mocks Incompletos

## Severidad
High

## Categoría
Networking

## Ubicación
`packages/core/src/network/MultiplayerSystems.ts` (todo el archivo)

## Descripción
El servidor de Colyseus (`AsteroidsRoom.ts`) se jacta de contar con múltiples modos de optimización de ancho de banda sofisticados (interés de campo, presupuestos de red `budget`, compresión binaria `binary` y delta snapshots). Sin embargo, al analizar el archivo de soporte de red central en el core del motor (`MultiplayerSystems.ts`), descubrimos que todas estas clases cruciales son meros cascarones vacíos o stubs (fakes) que no implementan ninguna lógica real. El "compresor binario" simplemente devuelve el mismo paquete sin comprimir, y el sistema de delta compresión retorna un objeto vacío `{}` en su lugar.

## Evidencia
En `packages/core/src/network/MultiplayerSystems.ts`:
```typescript
export class ClientAckTracker {
    public recordAck(sessionId: string, sequence: number, tick: number): void {}
    public nextSequence(sessionId: string): number { return 0; }
    public getLastAckedSequence(sessionId: string): number { return 0; }
    public getIdleTime(sessionId: string): number { return 0; }
}
export class NetworkDeltaSystem {
    constructor(tracker: ReplicationStateTracker) {}
    public generateDelta(world: any, sessionId: string, sequence: number, baselineAck: number, interestIds: Set<number>, forceFull: boolean): any { return {}; }
}
export class BinaryCompression {
    public static pack(packet: any): any { return packet; }
    public static unpack<T = any>(packet: any): T { return packet as T; }
}
```

## Consecuencias
- **Pérdida Crítica de Rendimiento en Red**: Al activar el modo `delta` o `binary` en la configuración de la sala del servidor, los clientes dejarán de recibir datos de juego reales (ya que la delta genera un mapa vacío `{}`), provocando que las naves y proyectiles de otros jugadores desaparezcan de sus pantallas locales.
- **Engaño Técnico**: Genera falsas expectativas de optimización de red que en la práctica desactivan por completo la sincronización del juego.

## Solución propuesta
Implementar de forma real los subsistemas de optimización de red:
1. **Delta Snapshots Reales**: `NetworkDeltaSystem` debe comparar el snapshot actual con el snapshot guardado en la secuencia de confirmación (`baselineAck`) del cliente, filtrando y serializando exclusivamente las diferencias (deltas).
2. **Compresión Binaria Real**: Integrar un codificador ligero basado en buffers de protocolo (`Protocol Buffers`) o empaquetado binario manual estructurado para serializar el estado de los componentes con el mínimo número de bytes posible, en lugar de retornar el objeto crudo.

## Dificultad
Muy Alta

## Prioridad
P1

## Dependencias
Ninguna.

---

### 3. Falta de Interpolación de Red en Otros Juegos de la Arcade

## Título
Movimiento Entrecortado: Ausencia de Interpolación Visual en Pong y Flappy Bird Multijugador

## Severidad
Medium

## Categoría
Networking

## Ubicación
`src/games/pong/PongGame.ts` y `src/games/flappybird/FlappyBirdGame.ts`

## Descripción
Mientras que Asteroids implementa (aunque con errores) un sistema de predicción e interpolación para suavizar el movimiento de entidades remotas de red, los modos multijugador en línea de Flappy Bird y Pong carecen de lógica de interpolación visual intermedia. Al actualizar los datos del servidor, las entidades (paletas de Pong, tuberías de Flappy Bird) son teleportadas de manera instantánea a las nuevas coordenadas enviadas por la red, lo que se traduce en un movimiento tosco y a tirones (jittering) si la latencia del jugador es alta.

## Evidencia
En `src/games/pong/PongGame.ts`:
```typescript
  public updateFromServer(state: Record<string, unknown>) {
    if (this._config.gameOptions?.mode !== "online" || !state) return;

    if (this.networkController && state.input_relay) {
        this.networkController.onInputReceived({
            tick: state.tick as number,
            input: state.input as PongInput
        });
    }
  }
```
No se realiza ningún filtrado ni interpolación lineal (Lerp) para suavizar la renderización de la paleta del oponente remoto.

## Consecuencias
- **Experiencia de Usuario Deficiente (Poor UX)**: El juego multijugador online resulta tosco visualmente y desagradable de jugar frente a cualquier fluctuación menor en los tiempos de ping del internet.

## Solución propuesta
Reutilizar el renderizado con interpolación temporal ya definido en `@tiny-aster/core` para que tanto Pong como Flappy Bird asimilen factores de retraso controlados y actualicen las posiciones visuales de forma suave empleando interpolación temporal (Lerp) en lugar de aserciones de coordenadas rígidas.

## Dificultad
Media

## Prioridad
P2

## Dependencias
Ninguna.
